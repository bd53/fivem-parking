import fetch from "node-fetch";
import Config from "./config";

export function loadJson<T = unknown>(path: string): T {
        return JSON.parse(LoadResourceFile(GetCurrentResourceName(), path)) as T;
}

export function getPlayerLicense(source: number): string | null {
        return GetPlayerIdentifierByType(String(source), "license2") || null;
}

export function getPlayerDisplayName(source: number): string {
        return GetPlayerName(String(source)) ?? String(source);
}

export function generatePlate(): string {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// Replace this with your preferred notification method
export function sendChatMessage(source: number, message: string) {
        exports.chat.addMessage(source, message);
}

export function getArea(coords: { x: number; y: number; z: number }, areas: { x: number; y: number; z: number; radius: number }[]) {
        return areas.some((area) => {
                const distance = Math.sqrt((coords.x - area.x) ** 2 + (coords.y - area.y) ** 2 + (coords.z - area.z) ** 2);
                return distance <= area.radius;
        });
}

export function isValidPlate(plate: string): boolean {
        return (typeof plate === "string" && plate.length >= 1 && plate.length <= 8 && /^[A-Z0-9 ]+$/.test(plate));
}

export function isValidModelName(model: string): boolean {
        return (typeof model === "string" && model.length >= 1 && model.length <= 30 && /^[a-zA-Z0-9_]+$/.test(model));
}

const PREFIX = "https://discord.com/api/webhooks/";

export async function sendLog(message: string) {
        if (!Config.Webhook || !Config.Webhook.startsWith(PREFIX)) return;
        const date = new Date();
        await fetch(Config.Webhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                        username: GetCurrentResourceName(),
                        content: `**[${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}]** ${message}`,
                }),
        });
}
