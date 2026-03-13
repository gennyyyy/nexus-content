export function chunkMessage(text: string, maxLength = 1800): string[] {
    if (text.length <= maxLength) {
        return [text];
    }

    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > maxLength) {
        let splitAt = remaining.lastIndexOf("\n", maxLength);
        if (splitAt < Math.floor(maxLength * 0.6)) {
            splitAt = maxLength;
        }

        chunks.push(remaining.slice(0, splitAt).trim());
        remaining = remaining.slice(splitAt).trim();
    }

    if (remaining.length > 0) {
        chunks.push(remaining);
    }

    return chunks.filter(Boolean);
}

export function statusLabel(status: string): string {
    return status.replaceAll("_", " ");
}
