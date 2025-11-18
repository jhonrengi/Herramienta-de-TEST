const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0 ^ -1;
  for (let i = 0; i < buffer.length; i += 1) {
    const byte = buffer[i];
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function toDosDateParts(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();
  return { dosTime, dosDate };
}

function ensureBuffer(contents) {
  if (Buffer.isBuffer(contents)) {
    return contents;
  }
  if (typeof contents === 'string') {
    return Buffer.from(contents, 'utf8');
  }
  return Buffer.from(String(contents ?? ''), 'utf8');
}

function sanitizeName(name) {
  if (!name) {
    return 'file.txt';
  }
  return name.replace(/\\/g, '/').replace(/^\/+/, '');
}

function createZipBuffer(fileMap = {}) {
  const entries = Object.entries(fileMap).map(([name, contents]) => ({
    name: sanitizeName(name),
    data: ensureBuffer(contents)
  }));

  if (!entries.length) {
    throw new Error('No hay archivos para exportar.');
  }

  const dataChunks = [];
  const centralChunks = [];
  const now = new Date();
  let offset = 0;

  for (const entry of entries) {
    const { data } = entry;
    const { dosTime, dosDate } = toDosDateParts(now);
    const nameBuffer = Buffer.from(entry.name, 'utf8');
    const crc = crc32(data);
    const compressedSize = data.length;
    const uncompressedSize = data.length;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime & 0xffff, 10);
    localHeader.writeUInt16LE(dosDate & 0xffff, 12);
    localHeader.writeUInt32LE(crc >>> 0, 14);
    localHeader.writeUInt32LE(compressedSize >>> 0, 18);
    localHeader.writeUInt32LE(uncompressedSize >>> 0, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    const localOffset = offset;
    dataChunks.push(localHeader, nameBuffer, data);
    offset += localHeader.length + nameBuffer.length + data.length;

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(0x0314, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime & 0xffff, 12);
    centralHeader.writeUInt16LE(dosDate & 0xffff, 14);
    centralHeader.writeUInt32LE(crc >>> 0, 16);
    centralHeader.writeUInt32LE(compressedSize >>> 0, 20);
    centralHeader.writeUInt32LE(uncompressedSize >>> 0, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt32LE(0, 36);
    centralHeader.writeUInt32LE(localOffset >>> 0, 42);

    centralChunks.push(centralHeader, nameBuffer);
  }

  const centralSize = centralChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralSize >>> 0, 12);
  endRecord.writeUInt32LE(offset >>> 0, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...dataChunks, ...centralChunks, endRecord]);
}

module.exports = {
  createZipBuffer
};
