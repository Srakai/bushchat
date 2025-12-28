/**
 * Utilities for sharing chat state via URL hash
 * Chat state is gzipped and base64 encoded for compact sharing
 */

import pako from "pako";

/**
 * Encode chat state to a compressed base64 string for URL sharing
 * @param {Object} chatState - The chat state object with nodes, edges, selectedNodeId, nodeIdCounter
 * @returns {string} - Base64 encoded gzipped string
 */
export const encodeChatState = (chatState) => {
  try {
    // Convert to JSON string
    const jsonString = JSON.stringify(chatState);

    // Convert string to Uint8Array
    const textEncoder = new TextEncoder();
    const data = textEncoder.encode(jsonString);

    // Gzip compress
    const compressed = pako.deflate(data);

    // Convert to base64
    // Use btoa with binary string conversion for browser compatibility
    const binaryString = String.fromCharCode.apply(null, compressed);
    const base64 = btoa(binaryString);

    // Make URL-safe by replacing +/= with -_
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch (error) {
    console.error("Failed to encode chat state:", error);
    return null;
  }
};

/**
 * Decode a compressed base64 string back to chat state
 * @param {string} encoded - Base64 encoded gzipped string from URL
 * @returns {Object|null} - The decoded chat state object, or null if decoding fails
 */
export const decodeChatState = (encoded) => {
  try {
    // Restore base64 padding and reverse URL-safe replacements
    let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    // Add padding if needed
    while (base64.length % 4) {
      base64 += "=";
    }

    // Convert from base64 to binary
    const binaryString = atob(base64);
    const compressed = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      compressed[i] = binaryString.charCodeAt(i);
    }

    // Decompress
    const decompressed = pako.inflate(compressed);

    // Convert back to string and parse JSON
    const textDecoder = new TextDecoder();
    const jsonString = textDecoder.decode(decompressed);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Failed to decode chat state:", error);
    return null;
  }
};

/**
 * Generate a shareable URL with the chat state in the hash
 * @param {Object} chatState - The chat state to share
 * @returns {string|null} - The full shareable URL, or null if encoding fails
 */
export const generateShareUrl = (chatState) => {
  const encoded = encodeChatState(chatState);
  if (!encoded) return null;

  // Use current origin and pathname, append hash
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#shared=${encoded}`;
};

/**
 * Extract shared chat state from the current URL hash
 * @returns {Object|null} - The decoded chat state, or null if no valid shared state
 */
export const getSharedChatFromUrl = () => {
  if (typeof window === "undefined") return null;

  const hash = window.location.hash;
  if (!hash.startsWith("#shared=")) return null;

  const encoded = hash.slice(8); // Remove '#shared='
  return decodeChatState(encoded);
};

/**
 * Clear the shared chat hash from the URL without triggering navigation
 */
export const clearShareHash = () => {
  if (typeof window === "undefined") return;

  // Use history.replaceState to remove hash without page reload
  const url = window.location.pathname + window.location.search;
  window.history.replaceState(null, "", url);
};
