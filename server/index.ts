import { sendChatMessage } from "./utils";
import "./commands";
import db from "./db";
import { garage } from "./garage/class";

on("onResourceStart", async (resourceName: string) => {
        if (resourceName !== GetCurrentResourceName()) return;
        const count = await db.resetOutsideVehicles();
        if (count > 0) console.log(`Reset ${count} ghost vehicle(s) to stored.`);
});

const cooldowns = new Map<number, number>();
const COOLDOWN_MS = 5000;

on("playerDropped", () => {
        cooldowns.delete(source);
});

setInterval(() => {
        const cutoff = Date.now() - COOLDOWN_MS * 2;
        for (const [playerId, ts] of cooldowns) {
                if (ts < cutoff) cooldowns.delete(playerId);
        }
}, 60000);

function checkCooldown(src: number): boolean {
        const last = cooldowns.get(src);
        const now = Date.now();
        if (last !== undefined && now - last < COOLDOWN_MS) return false;
        cooldowns.set(src, now);
        return true;
}

exports("impoundVehicle", async (plate: string): Promise<boolean> => {
        if (typeof plate !== "string" || !plate) return false;
        const vehicle = await db.getVehicleByPlate(plate.trim());
        if (!vehicle) return false;
        await db.setVehicleStatus(vehicle.id, "impound");
        return true;
});

exports("getVehicleByPlate", async (plate: string) => {
        if (typeof plate !== "string" || !plate) return null;
        return await db.getVehicleByPlate(plate.trim());
});

exports("getPlayerVehicles", async (license: string) => {
        if (typeof license !== "string" || !license) return [];
        return await db.getOwnedVehicles(license.trim());
});

exports("setVehicleStatus", async (plate: string, status: string): Promise<boolean> => {
        if (typeof plate !== "string" || !plate) return false;
        if (!["stored", "outside", "impound"].includes(status)) return false;
        const vehicle = await db.getVehicleByPlate(plate.trim());
        if (!vehicle) return false;
        await db.setVehicleStatus(vehicle.id, status);
        return true;
});

exports("isVehicleOutside", async (plate: string): Promise<boolean> => {
        if (typeof plate !== "string" || !plate) return false;
        const vehicle = await db.getVehicleByPlate(plate.trim());
        if (!vehicle) return false;
        return vehicle.stored === "outside";
});

onNet("fivem-parking:server:returnVehicle", async (vehicleId: number) => {
        const src = source;
        if (!checkCooldown(src)) {
                sendChatMessage(src, "^#d73232ERROR ^#ffffffPlease wait before performing another vehicle action.");
                return;
        }
        await garage.returnVehicle(src, { vehicleId });
});

onNet("fivem-parking:server:spawnVehicle", async (vehicleId: number) => {
        const src = source;
        if (!checkCooldown(src)) {
                sendChatMessage(src, "^#d73232ERROR ^#ffffffPlease wait before performing another vehicle action.");
                return;
        }
        await garage.spawnVehicle(src, { vehicleId });
});
