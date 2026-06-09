// National-team code -> display name. Shared by the data build and the UI.
export const COUNTRY_NAMES: Record<string, string> = {
  BRA: "Brazil", GER: "Germany", FRG: "West Germany", ARG: "Argentina",
  ITA: "Italy", FRA: "France", ENG: "England", ESP: "Spain", NED: "Netherlands",
  URU: "Uruguay", POR: "Portugal", BEL: "Belgium", CRO: "Croatia", MEX: "Mexico",
  USA: "USA", SUI: "Switzerland", SWE: "Sweden", POL: "Poland", DEN: "Denmark",
  RUS: "Russia", URS: "Soviet Union", SCG: "Serbia & Montenegro", SRB: "Serbia",
  YUG: "Yugoslavia", COL: "Colombia", CHI: "Chile", PER: "Peru", PAR: "Paraguay",
  ECU: "Ecuador", JPN: "Japan", KOR: "South Korea", AUS: "Australia",
  KSA: "Saudi Arabia", IRN: "Iran", MAR: "Morocco", SEN: "Senegal", NGA: "Nigeria",
  CMR: "Cameroon", GHA: "Ghana", CIV: "Ivory Coast", EGY: "Egypt", TUN: "Tunisia",
  ALG: "Algeria", RSA: "South Africa", CRC: "Costa Rica", BUL: "Bulgaria",
  ROU: "Romania", HUN: "Hungary", AUT: "Austria", CZE: "Czechia",
  TCH: "Czechoslovakia", SCO: "Scotland", IRL: "Ireland", NIR: "Northern Ireland",
  WAL: "Wales", GRE: "Greece", TUR: "Turkey", UKR: "Ukraine", NOR: "Norway",
  SVN: "Slovenia", SVK: "Slovakia", QAT: "Qatar", CAN: "Canada",
};

export function countryName(code: string): string {
  return COUNTRY_NAMES[code] ?? code;
}
