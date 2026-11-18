/** Built-in constants available in expressions, listed in the Variables panel. Names are Math.js symbols. */
export type ConstantInfo = { name: string; label: string; symbol: string };

export const MATH_CONSTANTS: ConstantInfo[] = [
  { name: "pi", label: "Pi", symbol: "π" },
  { name: "e", label: "Euler's number", symbol: "e" },
  { name: "phi", label: "Golden ratio", symbol: "φ" },
  { name: "tau", label: "Tau (2π)", symbol: "τ" },
];

export const PHYSICAL_CONSTANTS: ConstantInfo[] = [
  { name: "speedOfLight", label: "Speed of light", symbol: "c" },
  { name: "gravitationConstant", label: "Gravitational constant", symbol: "G" },
  { name: "gravity", label: "Standard gravity", symbol: "g₀" },
  { name: "planckConstant", label: "Planck constant", symbol: "h" },
  { name: "reducedPlanckConstant", label: "Reduced Planck constant", symbol: "ħ" },
  { name: "elementaryCharge", label: "Elementary charge", symbol: "e" },
  { name: "electronMass", label: "Electron mass", symbol: "mₑ" },
  { name: "protonMass", label: "Proton mass", symbol: "mₚ" },
  { name: "neutronMass", label: "Neutron mass", symbol: "mₙ" },
  { name: "atomicMass", label: "Atomic mass constant", symbol: "u" },
  { name: "avogadro", label: "Avogadro constant", symbol: "N_A" },
  { name: "boltzmann", label: "Boltzmann constant", symbol: "k_B" },
  { name: "gasConstant", label: "Gas constant", symbol: "R" },
  { name: "faraday", label: "Faraday constant", symbol: "F" },
  { name: "electricConstant", label: "Vacuum permittivity", symbol: "ε₀" },
  { name: "magneticConstant", label: "Vacuum permeability", symbol: "μ₀" },
  { name: "coulomb", label: "Coulomb constant", symbol: "kₑ" },
  { name: "stefanBoltzmann", label: "Stefan–Boltzmann constant", symbol: "σ" },
  { name: "bohrRadius", label: "Bohr radius", symbol: "a₀" },
  { name: "rydberg", label: "Rydberg constant", symbol: "R∞" },
];
