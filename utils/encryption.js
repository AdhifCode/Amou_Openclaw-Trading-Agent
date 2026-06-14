const crypto = require("crypto");

/**
 * Enkripsi API key sebelum disimpan di Redis atau memory
 * Gunakan ENCRYPTION_KEY dari .env
 */
class KeyEncryption {
  constructor(masterKey) {
    // Master key harus 32 byte untuk AES-256
    this.masterKey = crypto.createHash("sha256").update(masterKey).digest();
  }

  encrypt(plaintext) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", this.masterKey, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Return IV + encrypted data
    return `${iv.toString("hex")}:${encrypted}`;
  }

  decrypt(encryptedData) {
    const [ivHex, encrypted] = encryptedData.split(":");
    const iv = Buffer.from(ivHex, "hex");

    const decipher = crypto.createDecipheriv("aes-256-cbc", this.masterKey, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }
}

module.exports = { KeyEncryption };
