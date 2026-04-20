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
        let search = $state("");
        let sortBy = $state<"model" | "plate" | "status">("model");

        let menuEl = $state<HTMLElement | null>(null);
        let dragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        function onHeaderMousedown(e: MouseEvent) {
                if (!menuEl) return;
                const rect = menuEl.getBoundingClientRect();
                menuEl.style.left = rect.left + "px";
                menuEl.style.top = rect.top + "px";
                menuEl.style.right = "auto";
                dragOffsetX = e.clientX - rect.left;
                dragOffsetY = e.clientY - rect.top;
                dragging = true;
                e.preventDefault();
        }

        function onMousemove(e: MouseEvent) {
                if (!dragging || !menuEl) return;
                menuEl.style.left = e.clientX - dragOffsetX + "px";
                menuEl.style.top = e.clientY - dragOffsetY + "px";
        }

        function onMouseup() {
                if (dragging && menuEl) {
                        localStorage.setItem("fivem-parking:web:position", JSON.stringify({ left: menuEl.style.left, top: menuEl.style.top }));
                }
                dragging = false;
        }

        function restorePosition() {
                if (!menuEl) return;
                const saved = localStorage.getItem("fivem-parking:web:position");
                if (!saved) return;
                const { left, top } = JSON.parse(saved);
                menuEl.style.left = left;
                menuEl.style.top = top;
                menuEl.style.right = "auto";
        }

        const SORT_CYCLE: Array<"model" | "plate" | "status"> = [ "model", "plate", "status" ];
        const SORT_LABELS: Record<string, string> = { model: "Model", plate: "Plate", status: "Status" };

        let filtered = $derived(vehicles.filter((v) => {
                const q = search.toLowerCase();
                return (!q || v.model.toLowerCase().includes(q) || v.plate.toLowerCase().includes(q));
        }).sort((a, b) => {
                if (sortBy === "status") {
                        const ord: Record<string, number> = { stored: 0, outside: 1, impound: 2 };
                        return ((ord[a.stored ?? ""] ?? 3) - (ord[b.stored ?? ""] ?? 3));
                }
                if (sortBy === "plate") return a.plate.localeCompare(b.plate);
                return a.model.localeCompare(b.model);
        }));

        function cycleSortBy() {
                const idx = SORT_CYCLE.indexOf(sortBy);
                sortBy = SORT_CYCLE[(idx + 1) % SORT_CYCLE.length];
        }

        function badgeClass(status: string | null): string {
                const known: Record<string, string> = { stored: "stored", outside: "outside", impound: "impound" };
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

        $effect(() => {
                if (visible) restorePosition();
        });

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
                        search = "";
                        visible = true;
                }

                function onKeydown(e: KeyboardEvent) {
                        if (e.key === "Escape" && visible) closeMenu();
                }

                window.addEventListener("message", onMessage);
                window.addEventListener("keydown", onKeydown);
                window.addEventListener("mousemove", onMousemove);
                window.addEventListener("mouseup", onMouseup);

                return () => {
                        window.removeEventListener("message", onMessage);
                        window.removeEventListener("keydown", onKeydown);
                        window.removeEventListener("mousemove", onMousemove);
                        window.removeEventListener("mouseup", onMouseup);
                };
        });
</script>

{#if visible}
        <div id="menu" bind:this={menuEl}>
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div id="header" onmousedown={onHeaderMousedown}>
                        <span id="title">{title}</span><button id="close-btn" onclick={closeMenu}>&#x2715;</button>
                </div>
                <div id="toolbar">
                        <input id="search" type="text" placeholder="Search model or plate…" bind:value={search}/>
                        <button id="sort-btn" onclick={cycleSortBy}>{SORT_LABELS[sortBy]}</button>
                </div>
                <div id="list">
                        {#if filtered.length === 0}
                                <div id="empty">No vehicles found.</div>
                        {:else}
                                {#each filtered as v (v.id)}
                                        {@const vid = Number(v.id)}
                                        <div class="row" class:expanded={expandedId === vid}>
                                                <div class="row-info" role="button" tabindex="0" onclick={() => !readonly && toggleRow(vid)} onkeydown={(e) => e.key === "Enter" && !readonly && toggleRow(vid)}>
                                                        <div class="row-left">
                                                                <div class="row-model">{v.model}<span class="row-id">#{vid}</span></div>
                                                                <div class="row-plate">{v.plate}</div>
                                                        </div>
                                                        <div class="row-right">
                                                                <span class={badgeClass(v.stored)}>{v.stored ?? "N/A"}</span>
                                                                {#if !readonly}<span class="chevron" class:open={expandedId === vid}>›</span>{/if}
                                                        </div>
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
