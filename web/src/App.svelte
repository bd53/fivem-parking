<script lang="ts">
        import { onMount } from "svelte";

        type Vehicle = {
                id: number;
                plate: string;
                model: string;
                stored: string | null;
        };

        let visible = $state(false);
        let title = $state("Your Vehicles");
        let vehicles = $state<Vehicle[]>([]);
        let readonly = $state(false);
        let expandedId = $state<number | null>(null);

        function badgeClass(status: string | null): string {
                const known: Record<string, string> = {
                        stored: "stored",
                        outside: "outside",
                        impound: "impound",
                };
                return "badge badge-" + (known[status ?? ""] ?? "unknown");
        }

        function closeMenu() {
                visible = false;
                expandedId = null;
                fetch("https://fivem-parking/close", { method: "POST", body: "{}" });
        }

        function spawnVehicle(vehicleId: number) {
                fetch("https://fivem-parking/spawnVehicle", { method: "POST", body: JSON.stringify({ vehicleId }) });
                visible = false;
                expandedId = null;
        }

        function returnVehicle(vehicleId: number) {
                fetch("https://fivem-parking/returnVehicle", { method: "POST", body: JSON.stringify({ vehicleId }) });
                visible = false;
                expandedId = null;
        }

        function toggleRow(id: number) {
                expandedId = expandedId === id ? null : id;
        }

        onMount(() => {
                function onMessage(event: MessageEvent) {
                        const data = event.data;
                        if (!data || typeof data !== "object" || data.action !== "show") return;
                        title = typeof data.title === "string" ? data.title : "Your Vehicles";
                        readonly = data.readonly === true;
                        vehicles = Array.isArray(data.vehicles) ? data.vehicles.filter((v: any) => Number.isInteger(Number(v.id)) && Number(v.id) > 0) : [];
                        expandedId = null;
                        visible = true;
                }

                function onKeydown(e: KeyboardEvent) {
                        if (e.key === "Escape" && visible) closeMenu();
                }

                window.addEventListener("message", onMessage);
                window.addEventListener("keydown", onKeydown);

                return () => {
                        window.removeEventListener("message", onMessage);
                        window.removeEventListener("keydown", onKeydown);
                };
        });
</script>

{#if visible}
        <div id="menu">
                <div id="header">
                        <span id="title">{title}</span>
                        <button id="close-btn" onclick={closeMenu}>&#x2715;</button>
                </div>
                <div id="list">
                        {#if vehicles.length === 0}
                                <div id="empty">No vehicles found.</div>
                        {:else}
                                {#each vehicles as v (v.id)}
                                        {@const vid = Number(v.id)}
                                        <div class="row" class:expanded={expandedId === vid}>
                                                <div class="row-info" role="button" tabindex="0" onclick={() => !readonly && toggleRow(vid)} onkeydown={(e) => e.key === "Enter" && !readonly && toggleRow(vid)}>
                                                        <div class="row-left">
                                                                <div class="row-model">{v.model}<span class="row-id">#{vid}</span></div>
                                                                <div class="row-plate">{v.plate}</div>
                                                        </div>
                                                        <span class={badgeClass(v.stored)}>{v.stored ?? "N/A"}</span>
                                                </div>
                                                {#if !readonly}
                                                        <div class="row-actions">
                                                                {#if v.stored === "stored"}
                                                                        <button class="action-btn btn-spawn" onclick={(e) => { e.stopPropagation(); spawnVehicle(vid) }}>Spawn</button>
                                                                {:else if v.stored === "impound"}
                                                                        <button class="action-btn btn-return" onclick={(e) => { e.stopPropagation(); returnVehicle(vid) }}>Return from Impound</button>
                                                                {:else}
                                                                        <button class="action-btn btn-outside" disabled>Currently Outside</button>
                                                                {/if}
                                                        </div>
                                                {/if}
                                        </div>
                                {/each}
                        {/if}
                </div>
        </div>
{/if}
