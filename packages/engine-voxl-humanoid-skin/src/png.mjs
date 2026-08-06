import { deflateSync, inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");

function crc32(buffer) {
  let value = -1;
  for (const byte of buffer) {
    value ^= byte;
    for (let index = 0; index < 8; index += 1) {
      value = (value >>> 1) ^ (0xedb88320 & -(value & 1));
    }
  }
  return (value ^ -1) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length, 0);
  body.copy(output, 4);
  output.writeUInt32BE(crc32(body), data.length + 8);
  return output;
}

export function encodeRgbaPng(width, height, pixels) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error("PNG dimensions must be positive integers.");
  }
  if (!(pixels instanceof Uint8Array) || pixels.length !== width * height * 4) {
    throw new Error("PNG RGBA data length does not match its dimensions.");
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Array.from({ length: height }, (_, y) => Buffer.concat([
    Buffer.from([0]),
    Buffer.from(pixels.buffer, pixels.byteOffset + y * width * 4, width * 4),
  ]));
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function paeth(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  if (aboveDistance <= upperLeftDistance) return above;
  return upperLeft;
}

function unfilterRow(filter, row, previous, bytesPerPixel) {
  const output = Buffer.alloc(row.length);
  for (let index = 0; index < row.length; index += 1) {
    const left = index >= bytesPerPixel ? output[index - bytesPerPixel] : 0;
    const above = previous?.[index] ?? 0;
    const upperLeft = index >= bytesPerPixel ? (previous?.[index - bytesPerPixel] ?? 0) : 0;
    let prediction = 0;
    if (filter === 1) prediction = left;
    else if (filter === 2) prediction = above;
    else if (filter === 3) prediction = Math.floor((left + above) / 2);
    else if (filter === 4) prediction = paeth(left, above, upperLeft);
    else if (filter !== 0) throw new Error(`Unsupported PNG row filter '${filter}'.`);
    output[index] = (row[index] + prediction) & 0xff;
  }
  return output;
}

export function decodeRgbaPng(input) {
  const bytes = Buffer.from(input);
  if (bytes.length < PNG_SIGNATURE.length || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("File is not a PNG image.");
  }

  let offset = 8;
  let header;
  const compressed = [];
  let ended = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) throw new Error("PNG chunk extends beyond the file.");
    const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    const expectedCrc = bytes.readUInt32BE(offset + 8 + length);
    const actualCrc = crc32(Buffer.concat([Buffer.from(type), data]));
    if (expectedCrc !== actualCrc) throw new Error(`PNG chunk '${type}' failed its checksum.`);

    if (type === "IHDR") header = Buffer.from(data);
    else if (type === "IDAT") compressed.push(Buffer.from(data));
    else if (type === "PLTE") {
      // Optional for RGBA PNGs. Palette entries are only suggested colors here.
    }
    else if (type === "IEND") {
      ended = true;
      break;
    } else if (/^[A-Z]/.test(type)) {
      throw new Error(`Unsupported critical PNG chunk '${type}'.`);
    }
    offset = end;
  }

  if (!header || header.length !== 13 || !ended || compressed.length === 0) {
    throw new Error("PNG is missing required chunks.");
  }
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const bitDepth = header[8];
  const colorType = header[9];
  const compression = header[10];
  const filterMethod = header[11];
  const interlace = header[12];
  if (bitDepth !== 8 || colorType !== 6 || compression !== 0 || filterMethod !== 0 || interlace !== 0) {
    throw new Error("PNG must be non-interlaced 8-bit RGBA.");
  }
  if (width === 0 || height === 0 || width * height > 16_777_216) {
    throw new Error("PNG dimensions exceed the safe decoding limit.");
  }

  const rowLength = width * 4;
  const expectedLength = (rowLength + 1) * height;
  const inflated = inflateSync(Buffer.concat(compressed), { maxOutputLength: expectedLength });
  if (inflated.length !== expectedLength) {
    throw new Error("PNG pixel data length does not match its dimensions.");
  }
  const pixels = Buffer.alloc(width * height * 4);
  let previous;
  for (let y = 0; y < height; y += 1) {
    const start = y * (rowLength + 1);
    const row = unfilterRow(inflated[start], inflated.subarray(start + 1, start + 1 + rowLength), previous, 4);
    row.copy(pixels, y * rowLength);
    previous = row;
  }
  return { width, height, pixels };
}
