/** 加密后的二进制载荷。iv + cipher 都是 Uint8Array 序列化后的 base64 字符串。 */
export interface EncryptedBlob {
  /** base64(iv)，12 字节 */
  iv: string;
  /** base64(密文 + auth tag) */
  cipher: string;
  /** 版本号，便于未来升级加密方案 */
  v: 1;
}
