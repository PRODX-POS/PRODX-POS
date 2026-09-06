/**
 * PRODX POS - ESC/POS Binary Command Builder
 * 
 * Generates standards-compliant ESC/POS byte arrays for thermal receipt printers
 * (Epson, Star Micronics, Citizen, Bixolon, Xprinter, Rongta, etc.)
 */

export class EscPosBuilder {
  private buffer: number[] = [];

  constructor() {
    this.init();
  }

  /**
   * Clears buffer and initializes printer to standard default state (ESC @)
   */
  public init(): this {
    this.buffer.push(0x1b, 0x40);
    return this;
  }

  /**
   * Sets text alignment (ESC a n)
   * 0: Left, 1: Center, 2: Right
   */
  public align(align: 'left' | 'center' | 'right'): this {
    const val = align === 'center' ? 1 : align === 'right' ? 2 : 0;
    this.buffer.push(0x1b, 0x61, val);
    return this;
  }

  /**
   * Sets bold emphasis (ESC E n)
   */
  public bold(enable = true): this {
    this.buffer.push(0x1b, 0x45, enable ? 1 : 0);
    return this;
  }

  /**
   * Sets character size (GS ! n)
   * width: 1-8, height: 1-8 (1 is normal)
   */
  public textSize(width = 1, height = 1): this {
    const w = Math.max(1, Math.min(8, width)) - 1;
    const h = Math.max(1, Math.min(8, height)) - 1;
    const n = (w << 4) | h;
    this.buffer.push(0x1d, 0x21, n);
    return this;
  }

  /**
   * Sets underline (ESC - n)
   */
  public underline(enable = true, thick = false): this {
    this.buffer.push(0x1b, 0x2d, enable ? (thick ? 2 : 1) : 0);
    return this;
  }

  /**
   * Sets inverted text (White on Black) (GS B n)
   */
  public invert(enable = true): this {
    this.buffer.push(0x1d, 0x42, enable ? 1 : 0);
    return this;
  }

  /**
   * Selects Font A (standard) or Font B (compressed) (ESC M n)
   */
  public font(font: 'A' | 'B'): this {
    this.buffer.push(0x1b, 0x4d, font === 'B' ? 1 : 0);
    return this;
  }

  /**
   * Appends raw ASCII / UTF-8 string bytes
   */
  public text(text: string): this {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(text);
    for (let i = 0; i < encoded.length; i++) {
      this.buffer.push(encoded[i]);
    }
    return this;
  }

  /**
   * Appends string followed by Line Feed (LF 0x0A)
   */
  public textLine(text = ''): this {
    this.text(text);
    this.buffer.push(0x0a);
    return this;
  }

  /**
   * Feeds n blank lines
   */
  public feed(lines = 1): this {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(0x0a);
    }
    return this;
  }

  /**
   * Appends full divider line matching column width
   */
  public divider(char = '-', columns = 48): this {
    const line = char.repeat(columns);
    this.textLine(line);
    return this;
  }

  /**
   * Prints a two-column row (Left aligned item name, Right aligned amount)
   */
  public twoColumnRow(left: string, right: string, totalColumns = 48): this {
    const spaceCount = Math.max(1, totalColumns - left.length - right.length);
    const line = left + ' '.repeat(spaceCount) + right;
    this.textLine(line);
    return this;
  }

  /**
   * Prints a three-column row (Qty + Item, Tax, Price)
   */
  public threeColumnRow(col1: string, col2: string, col3: string, totalColumns = 48): this {
    const c3Width = 10;
    const c2Width = 8;
    const c1Width = totalColumns - c3Width - c2Width;

    const padRight = (str: string, len: number) =>
      str.length > len ? str.slice(0, len - 1) + ' ' : str + ' '.repeat(len - str.length);
    const padLeft = (str: string, len: number) =>
      str.length > len ? str.slice(0, len) : ' '.repeat(len - str.length) + str;

    const line = padRight(col1, c1Width) + padLeft(col2, c2Width) + padLeft(col3, c3Width);
    this.textLine(line);
    return this;
  }

  /**
   * Sends cash drawer kick pulse (ESC p m t1 t2)
   * pin: 2 or 5
   */
  public kickDrawer(pin: 2 | 5 = 2, pulseMs = 50): this {
    const m = pin === 2 ? 0 : 1;
    const t1 = Math.min(255, Math.max(1, Math.floor(pulseMs / 2)));
    const t2 = Math.min(255, Math.max(1, Math.floor(pulseMs / 2)));
    this.buffer.push(0x1b, 0x70, m, t1, t2);
    return this;
  }

  /**
   * Cuts paper with feed (GS V m n)
   */
  public cut(partial = false, feedLines = 3): this {
    this.feed(feedLines);
    this.buffer.push(0x1d, 0x56, partial ? 66 : 65, 0);
    return this;
  }

  /**
   * Triggers printer buzzer / beep (ESC B n t)
   */
  public beep(times = 1, duration = 2): this {
    this.buffer.push(0x1b, 0x42, times, duration);
    return this;
  }

  /**
   * Generates QR Code ESC/POS sequence (Model 2)
   */
  public qrCode(data: string, moduleSize = 5): this {
    this.align('center');
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    const len = dataBytes.length + 3;
    const pL = len & 0xff;
    const pH = (len >> 8) & 0xff;

    // 1. Model select (Model 2)
    this.buffer.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    // 2. Module size (3-8)
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, Math.min(8, Math.max(2, moduleSize)));
    // 3. Error correction level (M = 49)
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31);
    // 4. Store data in symbol storage area
    this.buffer.push(0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30);
    for (let i = 0; i < dataBytes.length; i++) {
      this.buffer.push(dataBytes[i]);
    }
    // 5. Print the QR code
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
    this.feed(1);
    return this;
  }

  /**
   * Generates Code 128 Barcode sequence (GS k)
   */
  public barcode(data: string, height = 50, width = 2): this {
    this.align('center');
    // Set barcode height
    this.buffer.push(0x1d, 0x68, height);
    // Set barcode module width (2-4)
    this.buffer.push(0x1d, 0x77, width);
    // Set HRI characters below barcode (2 = below)
    this.buffer.push(0x1d, 0x48, 2);

    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    // GS k 73 (Code 128) len data
    this.buffer.push(0x1d, 0x6b, 73, dataBytes.length);
    for (let i = 0; i < dataBytes.length; i++) {
      this.buffer.push(dataBytes[i]);
    }
    this.feed(1);
    return this;
  }

  /**
   * Returns final compiled Uint8Array binary
   */
  public toUint8Array(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  /**
   * Returns Hex Dump representation for debugging / inspection
   */
  public toHexDump(): string {
    const bytes = this.toUint8Array();
    const hex: string[] = [];
    for (let i = 0; i < bytes.length; i++) {
      hex.push(bytes[i].toString(16).padStart(2, '0').toUpperCase());
    }
    return hex.join(' ');
  }
}
