import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const mockNames = [
  'Naledi Khumalo',
  'Sipho Nkosi',
  'Thabo Mokoena',
  'Lerato Dlamini'
]

async function seedPlayers() {
  console.log('Seeding mock players...')

  for (const name of mockNames) {
    try {
      const player = await prisma.player.create({
        data: {
          name: name
        }
      })
      console.log(`Created player: ${player.name}`)
    } catch (error) {
      console.log(`Player ${name} already exists or error:`, error instanceof Error ? error.message : String(error))
    }
  }

  console.log('Seeding complete.')
  await prisma.$disconnect()
}

seedPlayers().catch((e) => {
  console.error(e)
  process.exit(1)
})