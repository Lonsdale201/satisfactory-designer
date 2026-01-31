import { Item, ItemRecipe, ItemRequirement, Building } from "../types";
import { useMemo } from "react";

type UseBuildingRecipesInput = {
  selectedOutputItem: Item | undefined;
  buildingId: string;
  displayData: Record<string, unknown>;
  items: Item[];
  selectedBuilding: Building | undefined;
  incomingItems?: string[];
  productionRate?: number;
};

type RecipeEntry = { recipe: ItemRecipe; index: number };

type AltOption = { requirements: ItemRequirement[]; index: number };

type RequiredInput = {
  itemId: string;
  amount: number;
  perMin: number;
  item: Item | undefined;
};

type UseBuildingRecipesResult = {
  recipes: ItemRecipe[];
  recipeEntries: RecipeEntry[];
  hasRecipes: boolean;
  effectiveRecipeIndex: number;
  activeRecipe: ItemRecipe | undefined;
  activeRecipeOutput: number | undefined;
  selectedAltIndex: number | null | undefined;
  alternateOptions: Array<Array<{ item: string; amount: number }>>;
  filteredAltOptions: AltOption[];
  hasAlternateOptions: boolean;
  canUseDefault: boolean;
  effectiveAltIndex: number;
  activeAlt: Array<{ item: string; amount: number }> | undefined;
  activeRequirements: ItemRequirement[];
  activeByproducts: ItemRequirement[];
  requiredInputs: RequiredInput[];
  requirementsMet: boolean | null;
  missingRequirements: string[];
  outputRows: Array<{ id: string; name: string; rate: number }>;
  getRecipeLabel: (recipe: ItemRecipe) => string;
  getAltLabel: (requirements: ItemRequirement[]) => string;
};

export function useBuildingRecipes({
  selectedOutputItem,
  buildingId,
  displayData,
  items,
  selectedBuilding,
  incomingItems,
  productionRate = 0,
}: UseBuildingRecipesInput): UseBuildingRecipesResult {
  const recipes = selectedOutputItem?.recipes ?? [];
  const rawRecipeEntries = useMemo(
    () => recipes.map((recipe, index) => ({ recipe, index })),
    [recipes],
  );

  const filteredRecipeEntries = useMemo(
    () =>
      rawRecipeEntries.filter(({ recipe }) => {
        const producer = recipe.producer;
        const producers = recipe.producers;
        if (!producer && !producers) return true;
        if (!buildingId) return true;
        if (producer && producer === buildingId) return true;
        if (producers && producers.includes(buildingId)) return true;
        return false;
      }),
    [rawRecipeEntries, buildingId],
  );

  const recipeEntries =
    filteredRecipeEntries.length > 0 ? filteredRecipeEntries : rawRecipeEntries;
  const hasRecipes = recipeEntries.length > 0;

  const selectedRecipeIndex = displayData.selectedRecipeIndex as
    | number
    | undefined;
  const rawRecipeIndex =
    selectedRecipeIndex ?? selectedOutputItem?.defaultRecipeIndex ?? 0;
  const hasSelectedRecipe = recipeEntries.some(
    (entry) => entry.index === rawRecipeIndex,
  );
  const effectiveRecipeIndex = hasSelectedRecipe
    ? rawRecipeIndex
    : recipeEntries[0]?.index ?? rawRecipeIndex;

  const activeRecipe = hasRecipes
    ? recipes[effectiveRecipeIndex] ?? recipeEntries[0]?.recipe
    : undefined;
  const activeRecipeOutput = activeRecipe?.output;

  const alternateOptions = hasRecipes
    ? []
    : ((selectedOutputItem?.alternateRequires || []) as Array<
        Array<{ item: string; amount: number }>
      >);
  const alternateProducers = selectedOutputItem?.alternateProducers ?? [];
  const defaultProducer = selectedOutputItem?.defaultProducer;
  const producerList = selectedOutputItem?.producers ?? [];
  const canUseDefault = !buildingId
    ? true
    : defaultProducer
      ? defaultProducer === buildingId
      : producerList.includes(buildingId);
  const altOptionsWithIndex = alternateOptions.map((requirements, index) => ({
    requirements,
    index,
  }));
  const filteredAltOptions = altOptionsWithIndex.filter(({ index }) => {
    const producer = alternateProducers[index];
    return !producer || !buildingId || producer === buildingId;
  });
  const allowedAltIndices = new Set(
    filteredAltOptions.map((option) => option.index),
  );
  const selectedAltIndex = displayData.selectedAltIndex as
    | number
    | null
    | undefined;
  const hasExplicitAltSelection = typeof selectedAltIndex === "number";
  const effectiveAltIndex =
    hasExplicitAltSelection &&
    selectedAltIndex >= 0 &&
    allowedAltIndices.has(selectedAltIndex)
      ? selectedAltIndex
      : !canUseDefault && filteredAltOptions.length > 0
        ? filteredAltOptions[0].index
        : -1;
  const activeAlt =
    effectiveAltIndex >= 0 ? alternateOptions[effectiveAltIndex] : undefined;
  const hasAlternateOptions = filteredAltOptions.length > 0;

  const activeRequirements: ItemRequirement[] = hasRecipes
    ? activeRecipe?.inputs ?? selectedOutputItem?.recipes?.[0]?.inputs ?? []
    : (activeAlt ?? selectedOutputItem?.requires) ?? [];
  const activeByproducts: ItemRequirement[] =
    hasRecipes && activeRecipe?.byproducts ? activeRecipe.byproducts : [];

  const requirementsMet = useMemo(() => {
    if (!selectedOutputItem) return null;
    if (hasRecipes) {
      if (!activeRecipe || activeRequirements.length === 0) return null;
      const suppliedItems = incomingItems || [];
      return activeRequirements.every((req) => suppliedItems.includes(req.item));
    }
    const suppliedItems = incomingItems || [];
    if (activeAlt && activeAlt.length > 0) {
      return activeAlt.every((req) => suppliedItems.includes(req.item));
    }
    if (!selectedOutputItem.requires || selectedOutputItem.requires.length === 0) {
      return null;
    }
    return selectedOutputItem.requires.every((req) =>
      suppliedItems.includes(req.item),
    );
  }, [
    selectedOutputItem,
    incomingItems,
    hasRecipes,
    activeRecipe,
    activeRequirements,
    activeAlt,
  ]);

  const missingRequirements = useMemo(() => {
    if (!selectedOutputItem) return [];
    if (hasRecipes) {
      if (!activeRecipe || activeRequirements.length === 0) return [];
      const suppliedItems = (incomingItems || []) as string[];
      return activeRequirements
        .map((req) => req.item)
        .filter((reqItem) => !suppliedItems.includes(reqItem));
    }
    if (activeAlt && activeAlt.length > 0) {
      const suppliedItems = (incomingItems || []) as string[];
      return activeAlt
        .map((req) => req.item)
        .filter((reqItem) => !suppliedItems.includes(reqItem));
    }
    if (!selectedOutputItem.requires || selectedOutputItem.requires.length === 0) {
      return [];
    }
    const suppliedItems = (incomingItems || []) as string[];
    return selectedOutputItem.requires
      .map((req) => req.item)
      .filter((reqItem) => !suppliedItems.includes(reqItem));
  }, [
    selectedOutputItem,
    incomingItems,
    hasRecipes,
    activeRecipe,
    activeRequirements,
    activeAlt,
  ]);

  const requiredInputs: RequiredInput[] = useMemo(() => {
    if (!selectedOutputItem || activeRequirements.length === 0) {
      return [];
    }
    const altBaseProduction =
      !hasRecipes && effectiveAltIndex >= 0
        ? selectedOutputItem.alternateOutputRates?.[effectiveAltIndex]
        : undefined;
    const baseProduction =
      activeRecipeOutput ??
      altBaseProduction ??
      selectedOutputItem.defaultProduction ??
      selectedBuilding?.defaultProduction ??
      0;
    const currentProduction =
      (displayData.production as number) ||
      baseProduction ||
      selectedBuilding?.defaultProduction ||
      0;
    const scale =
      baseProduction > 0 && currentProduction > 0
        ? currentProduction / baseProduction
        : 1;
    return activeRequirements.map((req) => ({
      itemId: req.item,
      amount: req.amount,
      perMin: req.amount * scale,
      item: items.find((i) => i.id === req.item),
    }));
  }, [
    selectedOutputItem,
    activeRequirements,
    hasRecipes,
    effectiveAltIndex,
    activeRecipeOutput,
    displayData.production,
    selectedBuilding?.defaultProduction,
    items,
  ]);

  const outputRows = useMemo(() => {
    if (!selectedOutputItem) return [];
    const baseProduction = selectedOutputItem.defaultProduction ?? 0;
    const byproductScale =
      baseProduction > 0 ? productionRate / baseProduction : 1;
    return [
      {
        id: selectedOutputItem.id,
        name: selectedOutputItem.name,
        rate: productionRate,
      },
      ...activeByproducts.map((byproduct) => {
        const item = items.find((i) => i.id === byproduct.item);
        return {
          id: byproduct.item,
          name: item?.name ?? byproduct.item,
          rate: byproduct.amount * byproductScale,
        };
      }),
    ];
  }, [activeByproducts, items, productionRate, selectedOutputItem]);

  const getRecipeLabel = (recipe: ItemRecipe) => {
    if (recipe.name) return recipe.name;
    const names = recipe.inputs
      .map((req) => items.find((item) => item.id === req.item)?.name ?? req.item)
      .filter(Boolean)
      .join(" + ");
    return names || "Recipe";
  };

  const getAltLabel = (requirements: ItemRequirement[]) => {
    const names = requirements
      .map((req) => items.find((item) => item.id === req.item)?.name ?? req.item)
      .filter(Boolean)
      .join(" + ");
    return names || "Alternate";
  };

  return {
    recipes,
    recipeEntries,
    hasRecipes,
    effectiveRecipeIndex,
    activeRecipe,
    activeRecipeOutput,
    selectedAltIndex,
    alternateOptions,
    filteredAltOptions,
    hasAlternateOptions,
    canUseDefault,
    effectiveAltIndex,
    activeAlt,
    activeRequirements,
    activeByproducts,
    requiredInputs,
    requirementsMet,
    missingRequirements,
    outputRows,
    getRecipeLabel,
    getAltLabel,
  };
}
