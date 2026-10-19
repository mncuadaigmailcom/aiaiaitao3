'use strict';
const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../doors-entity-radar/src/Shared/Catalog.luau');
const source = fs.readFileSync(file, 'utf8');
const expected = {
  'THE HOTEL': ['Rush','Ambush','Eyes','Screech','Figure','Seek','Dupe','Halt','Hide','Timothy','Sally (Window)','Dread','Jeff','El Goblino','Bob','Jack','Moonlight','Weirdo','Glitch','Void','Red Barrier','Snare','Fallen Chandeliers'],
  'THE MINES': ['Rush','Ambush','Eyes','Screech','Figure','Seek','Dupe','Halt','Hide','Timothy','Dread','Giggle','Gloombats','Grumble','Queen Grumble','Charles','Dam Seek','Jeff','El Goblino','Bob','Louie','Moonlight','Jack','Weirdo','Glitch','Void','Red Barrier'],
  'THE BACKDOOR': ['Blitz','Haste','Lookman','Starlight','Glitch','Vacuum'],
  'THE ARCHIVES': ['Drone','Bash','Scribbles','Ransom','Forget Me Nots (Forget-Me-Not)','Teller','Alma','Honcho','Fih','Portrait','Starlight','Glitch','Currents','Office Chair'],
  'THE OUTDOORS': ['Mandrake','Surge','Monument','Eyestalk','Bramble','The Caw','Grampy','Groundskeeper','Starlight','Glitch','World Lotus','Snare','Flood'],
  'THE STAIRWELL': ['Creak','Noise','Stem','Hijack','Meld','Cobbler','Glitch','Fire Sprinklers','Crusher','Office Chair','Shopping Cart','Television Set'],
  'THE ROOMS': ['A-60','A-90','A-120'],
  'SPECIAL & EVENTS': ['Jeff The Killer','Greed','Evil Key','DRAKOBLOXXERS','SEEKING WALL!!!','LAVA!','Cringle','Treater','Rushing Light','RNIUSHCg==','AROxMBUSH','SCJVEREECH'],
};
let total = 0;
for (const [section, names] of Object.entries(expected)) {
  const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp('\\["' + escaped + '"\\]\\s*=\\s*\\{([^}]*)\\}'));
  if (!match) throw new Error(`Missing catalog section ${section}`);
  const actual = [...match[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
  if (JSON.stringify(actual) !== JSON.stringify(names)) {
    throw new Error(`${section} mismatch\nexpected ${JSON.stringify(names)}\nactual   ${JSON.stringify(actual)}`);
  }
  total += actual.length;
}
if (!source.includes('verified = false')) throw new Error('Catalog must not claim unverified DOORS mappings as verified.');
console.log(`DOORS RADAR catalog OK: ${Object.keys(expected).length} areas, ${total} entries, catalog mappings explicitly unverified.`);
