import { sendChatMessage } from "../common/utils";
import "./commands";
import db from "./db";
import { Garage } from "./garage/class";

const cooldowns = new Map<number, number>();
const COOLDOWN_MS = 5000;

on("playerDropped", () => {
        cooldowns.delete(source);
});

function checkCooldown(src: number): boolean {
        const last = cooldowns.get(src);
        const now = Date.now();
        if (last !== undefined && now - last < COOLDOWN_MS) return false;
        cooldowns.set(src, now);
        return true;
}

exports("impoundVehicle", async (plate: string): Promise<boolean> => {
        const vehicle = await db.getVehicleByPlate(plate.trim());
        if (!vehicle) return false;
        await db.setVehicleStatus(vehicle.id, "impound");
        return true;
});

exports("getVehicleByPlate", async (plate: string) => {
        return await db.getVehicleByPlate(plate.trim());
});

exports("getPlayerVehicles", async (license: string) => {
        return await db.getOwnedVehicles(license.trim());
});

exports("setVehicleStatus", async (plate: string, status: string): Promise<boolean> => {
        if (!["stored", "outside", "impound"].includes(status)) return false;
        const vehicle = await db.getVehicleByPlate(plate.trim());
        if (!vehicle) return false;
        await db.setVehicleStatus(vehicle.id, status);
        return true;
});

exports("isVehicleOutside", async (plate: string): Promise<boolean> => {
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
        await Garage.prototype.returnVehicle(src, { vehicleId });
});

onNet("fivem-parking:server:spawnVehicle", async (vehicleId: number) => {
        const src = source;
        if (!checkCooldown(src)) {
                sendChatMessage(src, "^#d73232ERROR ^#ffffffPlease wait before performing another vehicle action.");
                return;
        }
        await Garage.prototype.spawnVehicle(src, { vehicleId });
});
