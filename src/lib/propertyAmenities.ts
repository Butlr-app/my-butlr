export const propertyAmenities = [
  { id: 'pool', label: 'Piscine' },
  { id: 'heated_pool', label: 'Piscine chauffée' },
  { id: 'sea_view', label: 'Vue mer' },
  { id: 'spa', label: 'Spa / wellness' },
  { id: 'jacuzzi', label: 'Jacuzzi' },
  { id: 'sauna', label: 'Sauna' },
  { id: 'hammam', label: 'Hammam' },
  { id: 'parking', label: 'Parking' },
  { id: 'ev_charger', label: 'Borne de recharge' },
  { id: 'staff', label: 'Personnel sur place' },
  { id: 'housekeeping', label: 'Service de ménage' },
  { id: 'gym', label: 'Salle de sport' },
  { id: 'wifi', label: 'Wi-Fi' },
  { id: 'ac', label: 'Climatisation' },
  { id: 'heating', label: 'Chauffage' },
  { id: 'fireplace', label: 'Cheminée' },
  { id: 'chef', label: 'Chef privé' },
  { id: 'private_beach', label: 'Plage privée' },
  { id: 'garden', label: 'Jardin' },
  { id: 'terrace', label: 'Terrasse' },
  { id: 'bbq', label: 'Barbecue' },
  { id: 'outdoor_kitchen', label: 'Cuisine extérieure' },
  { id: 'cinema', label: 'Salle de cinéma' },
  { id: 'game_room', label: 'Salle de jeux' },
  { id: 'tennis', label: 'Court de tennis' },
  { id: 'padel', label: 'Terrain de padel' },
  { id: 'elevator', label: 'Ascenseur' },
  { id: 'accessible', label: 'Accès PMR' },
  { id: 'security', label: 'Sécurité 24h/24' },
  { id: 'alarm', label: 'Système d’alarme' },
  { id: 'laundry', label: 'Buanderie' },
  { id: 'workspace', label: 'Espace de travail' },
  { id: 'baby_equipment', label: 'Équipement bébé' },
  { id: 'pet_friendly', label: 'Animaux acceptés' },
  { id: 'mooring', label: 'Anneau d’amarrage' },
  { id: 'ski_in_out', label: 'Accès skis aux pieds' },
] as const

export type PropertyAmenityId = typeof propertyAmenities[number]['id']

export const CUSTOM_AMENITY_PREFIX = 'custom:'

export function customAmenityId(label: string): string {
  return `${CUSTOM_AMENITY_PREFIX}${label.trim()}`
}

export function amenityLabel(id: string): string {
  if (id.startsWith(CUSTOM_AMENITY_PREFIX)) {
    return id.slice(CUSTOM_AMENITY_PREFIX.length)
  }

  return propertyAmenities.find(amenity => amenity.id === id)?.label ?? id
}

export function amenityLabels(ids: string[]): string[] {
  return ids.map(amenityLabel)
}
