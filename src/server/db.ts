import { PrismaClient } from "@prisma/client";

type Vehicle = {
        id: number;
        plate: string;
        owner: string;
        model: string;
        stored: string;
};

const db = new (class Database {
        prisma: PrismaClient;

        constructor() {
                this.prisma = new PrismaClient();
        }

        private async handle<T>(operation: Promise<T>, name: string): Promise<T | null> {
                try {
                        return await operation;
                } catch (error) {
                        console.error(`${name}:`, error);
                        return null;
                }
        }

        public async getVehicle(id: number): Promise<Vehicle | null> {
                return this.handle(this.prisma.parking_vehicles.findFirst({ where: { id } }), "getVehicle");
        }

        public async getVehicleByPlate(plate: string): Promise<Vehicle | null> {
                return this.handle(this.prisma.parking_vehicles.findFirst({ where: { plate } }), "getVehicleByPlate");
        }

        public async getVehicleOwner(id: number, owner: string): Promise<boolean> {
                const result = await this.handle(this.prisma.parking_vehicles.findFirst({ where: { id, owner }, select: { id: true } }), "getVehicleOwner");
                return result !== null;
        }

        public async getVehicleStatus(id: number, status: string): Promise<boolean> {
                const result = await this.handle(this.prisma.parking_vehicles.findFirst({ where: { id, stored: status }, select: { id: true } }), "getVehicleStatus");
                return result !== null;
        }

        public async getOwnedVehicles(owner: string): Promise<Vehicle[]> {
                return ((await this.handle(this.prisma.parking_vehicles.findMany({ where: { owner }, select: { id: true, plate: true, owner: true, model: true, stored: true }, take: 100, orderBy: { id: "asc" } }), "getOwnedVehicles")) ?? []);
        }

        public async setVehicleStatus(id: number, status: string) {
                return this.handle(this.prisma.parking_vehicles.update({ where: { id }, data: { stored: status } }), "setVehicleStatus");
        }

        public async insertVehicle(plate: string, owner: string, model: string, stored: string = "stored") {
                return this.handle(this.prisma.parking_vehicles.create({ data: { plate, owner, model, stored } }), "insertVehicle");
        }

        public async deleteVehicle(plate: string) {
                return this.handle(this.prisma.parking_vehicles.delete({ where: { plate } }), "deleteVehicle");
        }
})();

on("onResourceStop", async (resourceName: string) => {
        if (resourceName !== GetCurrentResourceName()) return;
        await db.prisma.$disconnect();
});

export default db;
