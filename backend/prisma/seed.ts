import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Criando usuários padrão...')

  const adminHash = await bcrypt.hash('admin123', 12)
  const userHash = await bcrypt.hash('123456', 12)

  await prisma.user.upsert({
    where: { login: 'admin' },
    update: {},
    create: {
      nome: 'Administrador Sistema',
      email: 'admin@nos.com.br',
      telefone: '(11) 99999-0000',
      cargo: 'Administrador',
      empresa: 'NOS',
      login: 'admin',
      senha: adminHash,
      perfil: 'admin',
      status: 'ativo',
    }
  })

  await prisma.user.upsert({
    where: { login: 'joao.silva' },
    update: {},
    create: {
      nome: 'João Vendedor Silva',
      email: 'joao.silva@nos.com.br',
      telefone: '(11) 98888-1111',
      cargo: 'Vendedor',
      empresa: 'NOS',
      login: 'joao.silva',
      senha: userHash,
      perfil: 'vendedor',
      status: 'ativo',
    }
  })

  await prisma.user.upsert({
    where: { login: 'maria.santos' },
    update: {},
    create: {
      nome: 'Maria Operacional Santos',
      email: 'maria.santos@nos.com.br',
      telefone: '(11) 97777-2222',
      cargo: 'Operacional',
      empresa: 'NOS',
      login: 'maria.santos',
      senha: userHash,
      perfil: 'operacional',
      status: 'ativo',
    }
  })

  console.log('✅ Seed concluído!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
