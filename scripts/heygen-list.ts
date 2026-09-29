import { listAvatars, listVoices } from "./viral/heygen";

/** Prints your HeyGen avatar + voice IDs so you can fill in config/viral.config.ts. */
async function main() {
  const [avatars, voices] = await Promise.all([listAvatars(), listVoices()]);
  const filter = (process.argv[2] || "").toLowerCase();
  const match = (s: string) => !filter || s.toLowerCase().includes(filter);

  console.log("\n🎭 AVATARS  (type: \"avatar\")");
  avatars.avatars
    .filter((a) => match(a.avatar_name))
    .forEach((a) => console.log(`  ${a.avatar_id}  ${a.avatar_name}${a.premium ? "  (premium)" : ""}`));

  console.log("\n📸 PHOTO AVATARS  (type: \"talking_photo\")");
  avatars.talking_photos
    .filter((t) => match(t.talking_photo_name))
    .forEach((t) => console.log(`  ${t.talking_photo_id}  ${t.talking_photo_name}`));

  console.log("\n🗣️  VOICES (English)");
  voices.voices
    .filter((v) => /english/i.test(v.language) && match(v.name))
    .forEach((v) => console.log(`  ${v.voice_id}  ${v.name} (${v.gender || "?"})`));

  console.log("\nTip: `npm run heygen:list -- daniel` filters by name. Your own avatars/voice clones are in these lists too.\n");
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
