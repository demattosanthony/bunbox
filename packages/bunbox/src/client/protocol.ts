/**
 * Protocol helper for defining type-safe socket protocols
 */

/**
 * Protocol definition type - maps message type names to their data structures
 */
export type Protocol = Record<string, unknown>;

/**
 * Define a type-safe protocol for socket communication
 * This is just a type helper - no runtime logic
 *
 * @example
 * const ChatProtocol = defineProtocol({
 *   "chat-message": { text: "", username: "" },
 *   "user-joined": { username: "" },
 * });
 */
export function defineProtocol<T extends Protocol>(definition: T): T {
  return definition;
}
