// Amenity categories and items — mirrors Airbnb-style property equipment listing

export interface AmenityItem {
  key: string
  label: string
  labelFr: string
}

export interface AmenityCategory {
  key: string
  label: string
  labelFr: string
  icon: string // lucide icon name
  items: AmenityItem[]
}

export const AMENITY_CATEGORIES: AmenityCategory[] = [
  {
    key: 'essentials',
    label: 'Essentials',
    labelFr: 'Essentiels',
    icon: 'Star',
    items: [
      { key: 'washing_machine', label: 'Washing machine', labelFr: 'Machine à laver' },
      { key: 'dryer', label: 'Dryer', labelFr: 'Sèche-linge' },
      { key: 'air_conditioning', label: 'Air conditioning', labelFr: 'Air conditionné' },
      { key: 'central_heating', label: 'Central heating', labelFr: 'Chauffage général' },
      { key: 'wifi', label: 'WiFi', labelFr: 'Internet sans fil' },
      { key: 'stove', label: 'Stove', labelFr: 'Cuisinière' },
      { key: 'parking', label: 'Parking', labelFr: 'Parking' },
      { key: 'pets_allowed', label: 'Pets allowed', labelFr: 'Animaux acceptés' },
      { key: 'iron', label: 'Iron', labelFr: 'Fer à repasser' },
      { key: 'linens', label: 'Linens', labelFr: 'Linge de maison' },
      { key: 'towels', label: 'Towels', labelFr: 'Serviettes' },
    ],
  },
  {
    key: 'bathroom_laundry',
    label: 'Bathroom & Laundry',
    labelFr: 'Salle de bain et blanchisserie',
    icon: 'Bath',
    items: [
      { key: 'bathtub', label: 'Bathtub', labelFr: 'Baignoire' },
      { key: 'sink', label: 'Sink', labelFr: 'Lavabo' },
      { key: 'bidet', label: 'Bidet', labelFr: 'Bidet' },
      { key: 'hair_dryer', label: 'Hair dryer', labelFr: 'Sèche-cheveux' },
      { key: 'shampoo', label: 'Shampoo', labelFr: 'Shampoing' },
      { key: 'body_wash', label: 'Body wash', labelFr: 'Gel douche' },
      { key: 'hot_water', label: 'Hot water', labelFr: 'Eau chaude' },
      { key: 'outdoor_shower', label: 'Outdoor shower', labelFr: 'Douche extérieure' },
    ],
  },
  {
    key: 'entertainment',
    label: 'Entertainment',
    labelFr: 'Divertissement',
    icon: 'Tv',
    items: [
      { key: 'tv', label: 'TV', labelFr: 'Télévision' },
      { key: 'cable_tv', label: 'Cable TV', labelFr: 'Télévision par câble' },
      { key: 'satellite_tv', label: 'Satellite TV', labelFr: 'Télévision par satellite' },
      { key: 'streaming', label: 'Streaming (Netflix, etc.)', labelFr: 'Streaming (Netflix, etc.)' },
      { key: 'dvd_player', label: 'DVD player', labelFr: 'Lecteur DVD' },
      { key: 'stereo_system', label: 'Stereo system', labelFr: 'Système stéréo' },
      { key: 'piano', label: 'Piano', labelFr: 'Piano' },
      { key: 'game_console', label: 'Game console', labelFr: 'Console de jeux' },
      { key: 'board_games', label: 'Board games', labelFr: 'Jeux de société' },
      { key: 'books_library', label: 'Books / Library', labelFr: 'Bibliothèque' },
    ],
  },
  {
    key: 'heating_cooling',
    label: 'Heating & Cooling',
    labelFr: 'Chauffage et climatisation',
    icon: 'Thermometer',
    items: [
      { key: 'ceiling_fan', label: 'Ceiling fan', labelFr: 'Ventilateur de plafond' },
      { key: 'portable_fan', label: 'Portable fan', labelFr: 'Ventilateur portable' },
      { key: 'fireplace', label: 'Fireplace', labelFr: 'Cheminée' },
      { key: 'heated_floors', label: 'Heated floors', labelFr: 'Plancher chauffant' },
      { key: 'underfloor_heating', label: 'Underfloor heating', labelFr: 'Chauffage au sol' },
    ],
  },
  {
    key: 'security',
    label: 'Home Security',
    labelFr: 'Sécurité à la maison',
    icon: 'Shield',
    items: [
      { key: 'safe', label: 'Safe', labelFr: 'Coffre-fort' },
      { key: 'security_cameras', label: 'Security cameras', labelFr: 'Caméras de sécurité' },
      { key: 'alarm_system', label: 'Alarm system', labelFr: 'Système d\'alarme' },
      { key: 'smoke_detector', label: 'Smoke detector', labelFr: 'Détecteur de fumée' },
      { key: 'carbon_monoxide_detector', label: 'CO detector', labelFr: 'Détecteur de monoxyde de carbone' },
      { key: 'fire_extinguisher', label: 'Fire extinguisher', labelFr: 'Extincteur' },
      { key: 'first_aid_kit', label: 'First aid kit', labelFr: 'Trousse de secours' },
      { key: 'gated_property', label: 'Gated property', labelFr: 'Propriété clôturée' },
    ],
  },
  {
    key: 'internet_office',
    label: 'Internet & Office',
    labelFr: 'Internet et bureautique',
    icon: 'Wifi',
    items: [
      { key: 'high_speed_wifi', label: 'High-speed WiFi', labelFr: 'WiFi haut débit' },
      { key: 'dedicated_workspace', label: 'Dedicated workspace', labelFr: 'Espace de travail dédié' },
      { key: 'printer', label: 'Printer', labelFr: 'Imprimante' },
      { key: 'ethernet', label: 'Ethernet', labelFr: 'Connexion Ethernet' },
    ],
  },
  {
    key: 'kitchen_dining',
    label: 'Kitchen & Dining',
    labelFr: 'Cuisine et salle à manger',
    icon: 'UtensilsCrossed',
    items: [
      { key: 'full_kitchen', label: 'Full kitchen', labelFr: 'Cuisine équipée' },
      { key: 'oven', label: 'Oven', labelFr: 'Four' },
      { key: 'microwave', label: 'Microwave', labelFr: 'Micro-ondes' },
      { key: 'dishwasher', label: 'Dishwasher', labelFr: 'Lave-vaisselle' },
      { key: 'refrigerator', label: 'Refrigerator', labelFr: 'Réfrigérateur' },
      { key: 'freezer', label: 'Freezer', labelFr: 'Congélateur' },
      { key: 'wine_cellar', label: 'Wine cellar', labelFr: 'Cave à vin' },
      { key: 'coffee_machine', label: 'Coffee machine', labelFr: 'Machine à café' },
      { key: 'espresso_machine', label: 'Espresso machine', labelFr: 'Machine à expresso' },
      { key: 'toaster', label: 'Toaster', labelFr: 'Grille-pain' },
      { key: 'blender', label: 'Blender', labelFr: 'Mixeur' },
      { key: 'outdoor_kitchen', label: 'Outdoor kitchen', labelFr: 'Cuisine extérieure' },
      { key: 'bbq_grill', label: 'BBQ grill', labelFr: 'Barbecue' },
      { key: 'dining_table', label: 'Dining table', labelFr: 'Table à manger' },
      { key: 'outdoor_dining', label: 'Outdoor dining area', labelFr: 'Espace repas extérieur' },
    ],
  },
  {
    key: 'location_features',
    label: 'Location Features',
    labelFr: 'Caractéristiques de l\'emplacement',
    icon: 'MapPin',
    items: [
      { key: 'beachfront', label: 'Beachfront', labelFr: 'Front de mer' },
      { key: 'waterfront', label: 'Waterfront', labelFr: 'Bord de l\'eau' },
      { key: 'ski_in_out', label: 'Ski-in / Ski-out', labelFr: 'Ski aux pieds' },
      { key: 'mountain_view', label: 'Mountain view', labelFr: 'Vue montagne' },
      { key: 'sea_view', label: 'Sea view', labelFr: 'Vue mer' },
      { key: 'garden_view', label: 'Garden view', labelFr: 'Vue jardin' },
      { key: 'city_view', label: 'City view', labelFr: 'Vue ville' },
      { key: 'private_entrance', label: 'Private entrance', labelFr: 'Entrée privée' },
      { key: 'balcony', label: 'Balcony', labelFr: 'Balcon' },
      { key: 'terrace', label: 'Terrace', labelFr: 'Terrasse' },
      { key: 'rooftop', label: 'Rooftop', labelFr: 'Toit-terrasse' },
      { key: 'garden', label: 'Garden', labelFr: 'Jardin' },
      { key: 'private_beach', label: 'Private beach', labelFr: 'Plage privée' },
    ],
  },
  {
    key: 'parking_facilities',
    label: 'Parking & Facilities',
    labelFr: 'Parking et installations',
    icon: 'Car',
    items: [
      { key: 'free_parking', label: 'Free parking', labelFr: 'Parking gratuit' },
      { key: 'garage', label: 'Garage', labelFr: 'Garage' },
      { key: 'valet_parking', label: 'Valet parking', labelFr: 'Voiturier' },
      { key: 'ev_charger', label: 'EV charger', labelFr: 'Borne de recharge' },
      { key: 'elevator', label: 'Elevator', labelFr: 'Ascenseur' },
      { key: 'wheelchair_accessible', label: 'Wheelchair accessible', labelFr: 'Accessible PMR' },
      { key: 'helipad', label: 'Helipad', labelFr: 'Héliport' },
      { key: 'boat_dock', label: 'Boat dock', labelFr: 'Ponton / Mouillage' },
    ],
  },
  {
    key: 'pool_spa',
    label: 'Pool & Spa',
    labelFr: 'Piscine et spa',
    icon: 'Waves',
    items: [
      { key: 'swimming_pool', label: 'Swimming pool', labelFr: 'Piscine' },
      { key: 'infinity_pool', label: 'Infinity pool', labelFr: 'Piscine à débordement' },
      { key: 'heated_pool', label: 'Heated pool', labelFr: 'Piscine chauffée' },
      { key: 'indoor_pool', label: 'Indoor pool', labelFr: 'Piscine intérieure' },
      { key: 'children_pool', label: "Children's pool", labelFr: 'Piscine enfants' },
      { key: 'hot_tub', label: 'Hot tub / Jacuzzi', labelFr: 'Jacuzzi' },
      { key: 'sauna', label: 'Sauna', labelFr: 'Sauna' },
      { key: 'steam_room', label: 'Steam room', labelFr: 'Hammam' },
      { key: 'spa', label: 'Spa / Treatment room', labelFr: 'Spa / Salle de soins' },
      { key: 'gym', label: 'Gym / Fitness room', labelFr: 'Salle de sport' },
      { key: 'yoga_space', label: 'Yoga / Meditation space', labelFr: 'Espace yoga / méditation' },
    ],
  },
  {
    key: 'outdoor_activities',
    label: 'Outdoor & Activities',
    labelFr: 'Extérieur et activités',
    icon: 'TreePine',
    items: [
      { key: 'tennis_court', label: 'Tennis court', labelFr: 'Court de tennis' },
      { key: 'basketball_court', label: 'Basketball court', labelFr: 'Terrain de basket' },
      { key: 'volleyball', label: 'Volleyball', labelFr: 'Volleyball' },
      { key: 'petanque', label: 'Pétanque', labelFr: 'Pétanque' },
      { key: 'table_tennis', label: 'Table tennis', labelFr: 'Tennis de table' },
      { key: 'foosball', label: 'Foosball', labelFr: 'Baby-foot' },
      { key: 'pool_table', label: 'Pool / Billiard table', labelFr: 'Billard' },
      { key: 'bikes', label: 'Bikes', labelFr: 'Vélos' },
      { key: 'kayak_canoe', label: 'Kayak / Canoe', labelFr: 'Canoë / Kayak' },
      { key: 'boat', label: 'Boat', labelFr: 'Bateau' },
      { key: 'beach_chairs', label: 'Beach chairs', labelFr: 'Chaises de plage' },
      { key: 'sun_loungers', label: 'Sun loungers', labelFr: 'Bains de soleil' },
      { key: 'golf_cart', label: 'Golf cart', labelFr: 'Voiturette de golf' },
      { key: 'golf_clubs', label: 'Golf clubs', labelFr: 'Clubs de golf' },
      { key: 'playground', label: 'Playground', labelFr: 'Aire de jeux' },
    ],
  },
  {
    key: 'services',
    label: 'Services',
    labelFr: 'Services',
    icon: 'Concierge',
    items: [
      { key: 'concierge', label: 'Concierge', labelFr: 'Conciergerie' },
      { key: 'housekeeping', label: 'Housekeeping', labelFr: 'Service de ménage' },
      { key: 'private_chef', label: 'Private chef', labelFr: 'Chef privé' },
      { key: 'butler', label: 'Butler', labelFr: 'Majordome' },
      { key: 'babysitting', label: 'Babysitting', labelFr: 'Garde d\'enfants' },
      { key: 'airport_transfer', label: 'Airport transfer', labelFr: 'Transfert aéroport' },
      { key: 'car_rental', label: 'Car rental', labelFr: 'Location de voiture' },
      { key: 'laundry_service', label: 'Laundry service', labelFr: 'Service de blanchisserie' },
      { key: 'grocery_delivery', label: 'Grocery delivery', labelFr: 'Livraison courses' },
    ],
  },
]

// Room types
export interface RoomType {
  key: string
  label: string
  labelFr: string
  variants: string[]
  variantsFr: string[]
}

export const ROOM_TYPES: RoomType[] = [
  { key: 'bedroom', label: 'Bedroom', labelFr: 'Chambre à coucher', variants: ['private', 'shared'], variantsFr: ['privée', 'partagée'] },
  { key: 'bathroom', label: 'Bathroom', labelFr: 'Salle de bain', variants: ['private', 'shared'], variantsFr: ['privée', 'partagée'] },
  { key: 'living_room', label: 'Living room', labelFr: 'Salon', variants: ['private', 'shared'], variantsFr: ['privé', 'partagé'] },
  { key: 'office', label: 'Office', labelFr: 'Salle de travail', variants: ['private', 'shared'], variantsFr: ['privé', 'partagé'] },
  { key: 'kitchen', label: 'Kitchen', labelFr: 'Cuisine', variants: ['private', 'shared'], variantsFr: ['privée', 'partagée'] },
  { key: 'dining_room', label: 'Dining room', labelFr: 'Salle à manger', variants: ['private', 'shared'], variantsFr: ['privée', 'partagée'] },
]

// Bedding types
export interface BeddingType {
  key: string
  label: string
  labelFr: string
}

export const BEDDING_TYPES: BeddingType[] = [
  { key: 'king', label: 'King bed', labelFr: 'Lit king-size' },
  { key: 'queen', label: 'Queen bed', labelFr: 'Lit queen-size' },
  { key: 'double', label: 'Double bed', labelFr: 'Lit double' },
  { key: 'single', label: 'Single bed', labelFr: 'Lit simple' },
  { key: 'bunk', label: 'Bunk bed', labelFr: 'Lit superposé' },
  { key: 'sofa_bed', label: 'Sofa bed', labelFr: 'Canapé-lit' },
  { key: 'baby_crib', label: 'Baby crib', labelFr: 'Lit bébé' },
]

// Flatten all amenity keys for quick lookup
export function getAllAmenityKeys(): string[] {
  return AMENITY_CATEGORIES.flatMap(c => c.items.map(i => i.key))
}
