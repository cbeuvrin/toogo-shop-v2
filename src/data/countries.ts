export interface Country {
  code: string;
  name: string;
  phonePrefix: string;
  states: State[];
}

export interface State {
  code: string;
  name: string;
}

export const countries: Country[] = [
  {
    code: "MX",
    name: "México",
    phonePrefix: "+52",
    states: [
      { code: "AGU", name: "Aguascalientes" },
      { code: "BCN", name: "Baja California" },
      { code: "BCS", name: "Baja California Sur" },
      { code: "CAM", name: "Campeche" },
      { code: "CHP", name: "Chiapas" },
      { code: "CHH", name: "Chihuahua" },
      { code: "CMX", name: "Ciudad de México" },
      { code: "COA", name: "Coahuila" },
      { code: "COL", name: "Colima" },
      { code: "DUR", name: "Durango" },
      { code: "GUA", name: "Guanajuato" },
      { code: "GRO", name: "Guerrero" },
      { code: "HID", name: "Hidalgo" },
      { code: "JAL", name: "Jalisco" },
      { code: "MEX", name: "México" },
      { code: "MIC", name: "Michoacán" },
      { code: "MOR", name: "Morelos" },
      { code: "NAY", name: "Nayarit" },
      { code: "NLE", name: "Nuevo León" },
      { code: "OAX", name: "Oaxaca" },
      { code: "PUE", name: "Puebla" },
      { code: "QUE", name: "Querétaro" },
      { code: "ROO", name: "Quintana Roo" },
      { code: "SLP", name: "San Luis Potosí" },
      { code: "SIN", name: "Sinaloa" },
      { code: "SON", name: "Sonora" },
      { code: "TAB", name: "Tabasco" },
      { code: "TAM", name: "Tamaulipas" },
      { code: "TLA", name: "Tlaxcala" },
      { code: "VER", name: "Veracruz" },
      { code: "YUC", name: "Yucatán" },
      { code: "ZAC", name: "Zacatecas" }
    ]
  },
  {
    code: "US",
    name: "Estados Unidos",
    phonePrefix: "+1",
    states: [
      { code: "AL", name: "Alabama" },
      { code: "AK", name: "Alaska" },
      { code: "AZ", name: "Arizona" },
      { code: "AR", name: "Arkansas" },
      { code: "CA", name: "California" },
      { code: "CO", name: "Colorado" },
      { code: "CT", name: "Connecticut" },
      { code: "DE", name: "Delaware" },
      { code: "FL", name: "Florida" },
      { code: "GA", name: "Georgia" },
      { code: "HI", name: "Hawaii" },
      { code: "ID", name: "Idaho" },
      { code: "IL", name: "Illinois" },
      { code: "IN", name: "Indiana" },
      { code: "IA", name: "Iowa" },
      { code: "KS", name: "Kansas" },
      { code: "KY", name: "Kentucky" },
      { code: "LA", name: "Louisiana" },
      { code: "ME", name: "Maine" },
      { code: "MD", name: "Maryland" },
      { code: "MA", name: "Massachusetts" },
      { code: "MI", name: "Michigan" },
      { code: "MN", name: "Minnesota" },
      { code: "MS", name: "Mississippi" },
      { code: "MO", name: "Missouri" },
      { code: "MT", name: "Montana" },
      { code: "NE", name: "Nebraska" },
      { code: "NV", name: "Nevada" },
      { code: "NH", name: "New Hampshire" },
      { code: "NJ", name: "New Jersey" },
      { code: "NM", name: "New Mexico" },
      { code: "NY", name: "New York" },
      { code: "NC", name: "North Carolina" },
      { code: "ND", name: "North Dakota" },
      { code: "OH", name: "Ohio" },
      { code: "OK", name: "Oklahoma" },
      { code: "OR", name: "Oregon" },
      { code: "PA", name: "Pennsylvania" },
      { code: "RI", name: "Rhode Island" },
      { code: "SC", name: "South Carolina" },
      { code: "SD", name: "South Dakota" },
      { code: "TN", name: "Tennessee" },
      { code: "TX", name: "Texas" },
      { code: "UT", name: "Utah" },
      { code: "VT", name: "Vermont" },
      { code: "VA", name: "Virginia" },
      { code: "WA", name: "Washington" },
      { code: "WV", name: "West Virginia" },
      { code: "WI", name: "Wisconsin" },
      { code: "WY", name: "Wyoming" }
    ]
  },
  {
    code: "CO",
    name: "Colombia",
    phonePrefix: "+57",
    states: [
      { code: "AMA", name: "Amazonas" },
      { code: "ANT", name: "Antioquia" },
      { code: "ARA", name: "Arauca" },
      { code: "ATL", name: "Atlántico" },
      { code: "BOL", name: "Bolívar" },
      { code: "BOY", name: "Boyacá" },
      { code: "CAL", name: "Caldas" },
      { code: "CAQ", name: "Caquetá" },
      { code: "CAS", name: "Casanare" },
      { code: "CAU", name: "Cauca" },
      { code: "CES", name: "Cesar" },
      { code: "CHO", name: "Chocó" },
      { code: "COR", name: "Córdoba" },
      { code: "CUN", name: "Cundinamarca" },
      { code: "GUA", name: "Guainía" },
      { code: "GUV", name: "Guaviare" },
      { code: "HUI", name: "Huila" },
      { code: "LAG", name: "La Guajira" },
      { code: "MAG", name: "Magdalena" },
      { code: "MET", name: "Meta" },
      { code: "NAR", name: "Nariño" },
      { code: "NSA", name: "Norte de Santander" },
      { code: "PUT", name: "Putumayo" },
      { code: "QUI", name: "Quindío" },
      { code: "RIS", name: "Risaralda" },
      { code: "SAN", name: "Santander" },
      { code: "SUC", name: "Sucre" },
      { code: "TOL", name: "Tolima" },
      { code: "VAC", name: "Valle del Cauca" },
      { code: "VAU", name: "Vaupés" },
      { code: "VIC", name: "Vichada" }
    ]
  },
  {
    code: "AR",
    name: "Argentina",
    phonePrefix: "+54",
    states: [
      { code: "BA", name: "Buenos Aires" },
      { code: "CA", name: "Catamarca" },
      { code: "CH", name: "Chaco" },
      { code: "CT", name: "Chubut" },
      { code: "CB", name: "Córdoba" },
      { code: "CR", name: "Corrientes" },
      { code: "ER", name: "Entre Ríos" },
      { code: "FO", name: "Formosa" },
      { code: "JU", name: "Jujuy" },
      { code: "LP", name: "La Pampa" },
      { code: "LR", name: "La Rioja" },
      { code: "ME", name: "Mendoza" },
      { code: "MI", name: "Misiones" },
      { code: "NE", name: "Neuquén" },
      { code: "RN", name: "Río Negro" },
      { code: "SA", name: "Salta" },
      { code: "SJ", name: "San Juan" },
      { code: "SL", name: "San Luis" },
      { code: "SC", name: "Santa Cruz" },
      { code: "SF", name: "Santa Fe" },
      { code: "SE", name: "Santiago del Estero" },
      { code: "TF", name: "Tierra del Fuego" },
      { code: "TU", name: "Tucumán" }
    ]
  },
  {
    code: "ES",
    name: "España",
    phonePrefix: "+34",
    states: [
      { code: "AN", name: "Andalucía" },
      { code: "AR", name: "Aragón" },
      { code: "AS", name: "Asturias" },
      { code: "IB", name: "Islas Baleares" },
      { code: "CN", name: "Islas Canarias" },
      { code: "CB", name: "Cantabria" },
      { code: "CM", name: "Castilla-La Mancha" },
      { code: "CL", name: "Castilla y León" },
      { code: "CT", name: "Cataluña" },
      { code: "EX", name: "Extremadura" },
      { code: "GA", name: "Galicia" },
      { code: "MD", name: "Madrid" },
      { code: "MC", name: "Murcia" },
      { code: "NC", name: "Navarra" },
      { code: "PV", name: "País Vasco" },
      { code: "RI", name: "La Rioja" },
      { code: "VC", name: "Valencia" }
    ]
  },
  {
    code: "VE",
    name: "Venezuela",
    phonePrefix: "+58",
    states: [
      { code: "AMA", name: "Amazonas" },
      { code: "ANZ", name: "Anzoátegui" },
      { code: "APU", name: "Apure" },
      { code: "ARA", name: "Aragua" },
      { code: "BAR", name: "Barinas" },
      { code: "BOL", name: "Bolívar" },
      { code: "CAR", name: "Carabobo" },
      { code: "COJ", name: "Cojedes" },
      { code: "DEL", name: "Delta Amacuro" },
      { code: "DTC", name: "Distrito Capital" },
      { code: "FAL", name: "Falcón" },
      { code: "GUA", name: "Guárico" },
      { code: "LAR", name: "Lara" },
      { code: "MER", name: "Mérida" },
      { code: "MIR", name: "Miranda" },
      { code: "MON", name: "Monagas" },
      { code: "NES", name: "Nueva Esparta" },
      { code: "POR", name: "Portuguesa" },
      { code: "SUC", name: "Sucre" },
      { code: "TAC", name: "Táchira" },
      { code: "TRU", name: "Trujillo" },
      { code: "VAR", name: "Vargas" },
      { code: "YAR", name: "Yaracuy" },
      { code: "ZUL", name: "Zulia" }
    ]
  }
];

export const getCountryByCode = (code: string): Country | undefined => {
  return countries.find(country => country.code === code);
};

export const getStatesByCountry = (countryCode: string): State[] => {
  if (!countryCode) {
    console.warn('getStatesByCountry called with empty countryCode');
    return [];
  }
  
  const country = getCountryByCode(countryCode);
  if (!country) {
    console.warn('Country not found:', countryCode);
    return [];
  }
  
  return country.states || [];
};