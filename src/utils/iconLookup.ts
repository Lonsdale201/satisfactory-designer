import { Building, Item } from "../types";
import { normalizeKey } from "./nodeUi";

const itemImageMap = import.meta.glob("../assets/items/*", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;
const resourceImageMap = import.meta.glob("../assets/resources/*", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;
const buildingImageMap = import.meta.glob("../assets/building/*", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const findItemIconUrl = (item: Item | undefined) => {
  if (!item) return "";
  const idKey = normalizeKey(item.id);
  const nameKey = normalizeKey(item.name);
  const entry = Object.entries(itemImageMap).find(([path]) => {
    const fileKey = normalizeKey(
      (path.split("/").pop() || path).replace(/\.[^/.]+$/, ""),
    );
    return fileKey === idKey || fileKey === nameKey;
  });
  if (entry) return entry[1];
  if (item.category === "ore" || item.category === "fluid") {
    const resEntry = Object.entries(resourceImageMap).find(([path]) => {
      const fileKey = normalizeKey(
        (path.split("/").pop() || path).replace(/\.[^/.]+$/, ""),
      );
      return fileKey === idKey || fileKey === nameKey;
    });
    return resEntry ? resEntry[1] : "";
  }
  return "";
};

export const findBuildingIconUrl = (building: Building | undefined) => {
  if (!building) return "";
  if (building.id.startsWith("miner_mk")) {
    const match = Object.entries(buildingImageMap).find(([path]) =>
      normalizeKey(path).includes(normalizeKey("Miner_Mk")),
    );
    return match ? match[1] : "";
  }
  const idKey = normalizeKey(building.id);
  const nameKey = normalizeKey(building.name);
  const entry = Object.entries(buildingImageMap).find(([path]) => {
    const fileKey = normalizeKey(
      (path.split("/").pop() || path).replace(/\.[^/.]+$/, ""),
    );
    return fileKey === idKey || fileKey === nameKey;
  });
  return entry ? entry[1] : "";
};
