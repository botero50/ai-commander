// Unit type to cost mapping for calculating army value
// Costs are relative values used to estimate military strength in the HUD

export const UNIT_COSTS: Record<string, number> = {
  // Basic infantry
  infantry_swordsman: 60,
  infantry_spearman: 55,
  infantry_slinger: 40,

  // Cavalry
  cavalry_archer: 100,
  cavalry_crossbow: 110,
  cavalry_knight: 150,
  cavalry_lancer: 140,

  // Ranged
  archer: 45,
  crossbow: 50,
  slinger: 40,
  javelineer: 35,

  // Heroes & special
  hero: 300,
  hero_archer: 300,

  // Marines/naval
  trireme: 200,
  bireme: 180,
  fishing_boat: 30,

  // Workers (minimal cost - they're not military)
  worker: 10,
  villager: 10,
  citizen_soldier: 50,

  // Siege
  battering_ram: 120,
  ballista: 130,
  tower: 100,

  // Mounted
  mounted_archer: 120,
  mounted_slinger: 110,

  // Elephants
  war_elephant: 200,
  elephant_archer: 220,

  // Camels
  camel_archer: 100,

  // Default cost for unknown unit types
};

export function getUnitCost(unitType: string): number {
  // Try exact match first
  if (unitType in UNIT_COSTS) {
    return UNIT_COSTS[unitType];
  }

  // Try partial matching on common patterns
  const lowercaseType = unitType.toLowerCase();

  if (lowercaseType.includes('worker') || lowercaseType.includes('villager')) {
    return 10;
  }

  if (lowercaseType.includes('hero')) {
    return 300;
  }

  if (lowercaseType.includes('trireme') || lowercaseType.includes('warship')) {
    return 200;
  }

  if (lowercaseType.includes('elephant')) {
    return 200;
  }

  if (lowercaseType.includes('cavalry')) {
    return 120;
  }

  if (lowercaseType.includes('archer')) {
    return 50;
  }

  if (lowercaseType.includes('infantry') || lowercaseType.includes('swordsman')) {
    return 60;
  }

  // Unknown unit type gets a conservative estimate
  return 50;
}

// Tech building types used for counting technologies
export const TECH_BUILDING_TYPES = new Set([
  'blacksmith',
  'civil_centre',
  'market',
  'farmstead',
  'storehouse',
  'barracks',
  'stables',
  'archery_range',
  'siege_workshop',
  'dock',
  'library',
  'temple',
  'fortress',
  'wall_gate',
  'palisade_gate',
]);

export function isTechBuilding(buildingType: string): boolean {
  const lowerType = buildingType.toLowerCase();
  return TECH_BUILDING_TYPES.has(lowerType) || lowerType.includes('research');
}

// Worker unit types
export const WORKER_UNIT_TYPES = new Set(['worker', 'villager', 'civilian']);

export function isWorker(unitType: string): boolean {
  const lowerType = unitType.toLowerCase();
  return WORKER_UNIT_TYPES.has(lowerType) || lowerType.includes('worker') || lowerType.includes('villager');
}
