import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Old sample name -> new name. Run once on a database that still has the old sample players:
//   npx tsx rename-players.ts
const renames: Record<string, string> = {
  'Alice Johnson': 'Naledi Khumalo',
  'Bob Smith': 'Sipho Nkosi',
  'Charlie Brown': 'Thabo Mokoena',
  'Diana Prince': 'Lerato Dlamini'
}

async function renamePlayers() {
  for (const [oldName, newName] of Object.entries(renames)) {
    const result = await prisma.player.updateMany({
      where: { name: oldName },
      data: { name: newName }
    })
    console.log(result.count > 0 ? `Renamed ${oldName} to ${newName}` : `No player called ${oldName}`)
  }

  await prisma.$disconnect()
}

renamePlayers().catch((e) => {
  console.error(e)
  process.exit(1)
})
