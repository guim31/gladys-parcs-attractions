// -----------------------------------------------------------------------------
// The parks offered in the configuration form (manifest `parks` options): the
// European parks of ThemeParks.wiki, French ones first. Any other park of the
// service is reached through the `other_parks` field, by name or id.
// Ids are ThemeParks.wiki entity ids of type PARK (listed on 2026-10-30).
// -----------------------------------------------------------------------------

export const PARKS = [
  { id: 'ca888437-ebb4-4d50-aed2-d227f7096968', name: 'Disney Adventure World', country: 'FR' },
  { id: 'dae968d5-630d-4719-8b06-3d107e944401', name: 'Disneyland Park', country: 'FR' },
  { id: 'f111046c-f6e0-48f4-a1d2-bd9de612b980', name: 'Futuroscope', country: 'FR' },
  { id: '8d45b0e0-834c-4bef-afa9-a07d92e9f8f3', name: 'Nigloland', country: 'FR' },
  { id: '9e938687-fd99-46f3-986a-1878210378f8', name: 'Parc Asterix', country: 'FR' },
  { id: '28aee1df-1d05-4f53-bbf5-08f7aabff3a1', name: 'Walibi Rhône-Alpes', country: 'FR' },
  { id: '0d8ea921-37b1-4a9a-b8ef-5b45afea847b', name: 'Alton Towers', country: 'GB' },
  { id: 'f4bd1a23-44f0-444b-a91c-8d24f6ec5b1f', name: 'Attractiepark Toverland', country: 'NL' },
  { id: '164f3ee7-5fd7-47ac-addc-40b5e3e2b144', name: 'Bellewaerde', country: 'BE' },
  { id: '3782a489-b9ca-428f-8bb5-4de4fc38d815', name: 'Blackpool Pleasure Beach', country: 'GB' },
  { id: 'b4c6ca41-1cf6-465b-9f65-aea736a308cb', name: 'Bobbejaanland', country: 'BE' },
  { id: '91c92c4c-e079-4488-8c99-385bc81bd5d7', name: 'Caribe Aquatic Park', country: 'ES' },
  {
    id: 'ae959d1f-9fcc-4aab-8063-71e641fa57f4',
    name: 'Chessington World of Adventures',
    country: 'GB',
  },
  { id: '90917f88-4774-46d9-8b5c-23e5b94e8ded', name: 'Djurs Sommerland', country: 'DK' },
  { id: '30713cf6-69a9-47c9-a505-52bb965f01be', name: 'Efteling', country: 'NL' },
  { id: 'd13baede-ab6d-419e-930a-ce7029a092e5', name: 'Energylandia', country: 'PL' },
  { id: '639738d3-9574-4f60-ab5b-4c392901320b', name: 'Europa-Park', country: 'DE' },
  { id: 'd06d91b8-7702-42c3-a8af-7d0161d471bf', name: 'Ferrari Land', country: 'ES' },
  { id: '2fa98365-3f69-4741-a1c5-1f7e3a322b23', name: 'Flamingo Land', country: 'GB' },
  { id: '043211c0-76f2-4456-89f8-4001be01018d', name: 'Gardaland', country: 'IT' },
  { id: '5f28a518-dfb4-4650-a642-2d88c8e30d8e', name: 'Hansa-Park', country: 'DE' },
  { id: '66e12a41-3a09-40cd-8f55-8d335d9d7d93', name: 'Heide Park', country: 'DE' },
  { id: '99e7087b-951a-4322-84a8-572f26bc324d', name: 'LEGOLAND Billund', country: 'DK' },
  { id: 'e35cd439-ca3c-4234-ad92-d699995d0cba', name: 'LEGOLAND Deutschland', country: 'DE' },
  { id: 'a4f71074-e616-4de4-9278-72fdecbdc995', name: 'LEGOLAND Windsor', country: 'GB' },
  { id: '93142d7e-024a-4877-9c72-f8e904a37c0c', name: 'Liseberg', country: 'SE' },
  { id: '8bd6937c-71da-4c56-b780-600de69ba874', name: 'Mirabilandia', country: 'IT' },
  { id: 'bb26f3ad-3cad-4565-81b1-1ced1ed802c4', name: 'Movie Park Germany', country: 'DE' },
  {
    id: '44bda1cf-c82f-4df8-8331-9e8494eeff01',
    name: 'Movieland The Hollywood Park',
    country: 'IT',
  },
  {
    id: '1ea86991-e2c2-4771-8a32-c6e14c8298a9',
    name: 'Parque de Atracciones de Madrid',
    country: 'ES',
  },
  { id: '5adbd2f7-3694-4d23-aaec-4037a056573f', name: 'Parque Warner Madrid', country: 'ES' },
  { id: '6535c36f-ea51-4156-824e-f304b27fb1f6', name: 'Paultons Park', country: 'GB' },
  { id: 'abb67808-61e3-49ef-996c-1b97ed64fac6', name: 'Phantasialand', country: 'DE' },
  { id: 'f0ea9b9c-1ccb-4860-bfe6-b5aea7e4db2b', name: 'Plopsaland Belgium', country: 'BE' },
  { id: '3ad67aac-0b97-4961-8aa8-c3b8d2350873', name: 'Plopsaland Deutschland', country: 'DE' },
  { id: '32608bdc-b3fa-478e-a8c0-9dde197a4212', name: 'PortAventura Park', country: 'ES' },
  { id: '58392c29-d79d-49e4-9c35-0100d417d24e', name: 'Rulantica', country: 'DE' },
  { id: 'b08d9272-d070-4580-9fcd-375270b191a7', name: 'Thorpe Park', country: 'GB' },
  { id: '1e5d9bac-1ef7-4f8f-b0a3-28cc6ff860f5', name: 'Traumatica', country: 'DE' },
  { id: '21897ba2-cc63-460e-99b0-fcd4ca7c18ef', name: 'Walibi Belgium', country: 'BE' },
  { id: '18635b3e-fa23-4284-89dd-9fcd0aaa9c9c', name: 'Walibi Holland', country: 'NL' },
];
