import { Client, GatewayIntentBits, PermissionsBitField } from 'discord.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config(); // Carrega as variáveis de ambiente do arquivo .env

console.log('DISCORD_TOKEN:', process.env.DISCORD_TOKEN);

// Configurações do Discord
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// Obtém o token do ambiente
const discordToken = process.env.DISCORD_TOKEN;

// Configuração da Cohere API
const apiKey = process.env.COHERE_API_KEY; // Agora usando a variável de ambiente

// Função para adicionar um delay (em milissegundos)
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', err => {
    console.error('Uncaught Exception thrown:', err);
});

client.once('ready', () => {
    console.log(`Bot mal-humorado com IA logado como ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (!message.mentions.has(client.user) && !message.content.startsWith('!')) return;

    const userMessage = message.content.toLowerCase();

    // Comandos
    if (userMessage.startsWith('!')) {
        const args = userMessage.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === 'help') {
            message.channel.send(`
**Lista de Comandos Disponíveis:**
- !help: Exibe esta lista de comandos.
- !ping: Verifica a latência entre o bot e o servidor.
- !userinfo: Mostra informações sobre o usuário.
- !serverinfo: Fornece informações sobre o servidor.
- !avatar: Mostra o avatar do usuário.
- !clear [número]: Exclui uma quantidade específica de mensagens.
- !ban [@usuário] [motivo]: Bane um usuário do servidor.
- !kick [@usuário] [motivo]: Expulsa um usuário do servidor.
- !mute [@usuário] [tempo]: Silencia um usuário por um tempo específico.
- !unmute [@usuário]: Remove o silêncio de um usuário.
- !warn [@usuário] [motivo]: Avisa um usuário.
`);
        } else if (command === 'ping') {
            const latency = Date.now() - message.createdTimestamp;
            message.channel.send(`Pong! Latência é ${latency}ms.`);
        } else if (command === 'userinfo') {
            const user = message.mentions.users.first() || message.author;
            const member = message.guild.members.cache.get(user.id);
            message.channel.send(`
            **Informações do Usuário:**
            - Nome: ${user.username}
            - ID: ${user.id}
            - Data de Entrada: ${member.joinedAt.toDateString()}
            - Cargo(s): ${member.roles.cache.map(role => role.name).join(', ')}
            `);
        } else if (command === 'serverinfo') {
            message.channel.send(`
            **Informações do Servidor:**
            - Nome: ${message.guild.name}
            - Membros: ${message.guild.memberCount}
            - Data de Criação: ${message.guild.createdAt.toDateString()}
            `);
        } else if (command === 'avatar') {
            const user = message.mentions.users.first() || message.author;
            message.channel.send(user.displayAvatarURL());
        } else if (command === 'clear') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                return message.reply("Você não tem permissão para usar este comando.");
            }
            const amount = parseInt(args[0]);
            if (isNaN(amount) || amount < 1 || amount > 100) {
                return message.reply("Forneça um número válido de mensagens para excluir (1-100).");
            }
            message.channel.bulkDelete(amount, true).catch(err => {
                console.error(err);
                message.channel.send("Houve um erro ao tentar excluir as mensagens.");
            });
        } else if (command === 'ban') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                return message.reply("Você não tem permissão para banir membros.");
            }
            const user = message.mentions.users.first();
            const reason = args.slice(1).join(' ') || 'Nenhum motivo fornecido';
            if (user) {
                const member = message.guild.members.cache.get(user.id);
                if (member) {
                    member.ban({ reason })
                        .then(() => message.channel.send(`${user.tag} foi banido. Motivo: ${reason}`))
                        .catch(err => message.reply('Não consegui banir o membro.'));
                } else {
                    message.reply("Esse usuário não está no servidor.");
                }
            } else {
                message.reply("Mencione um usuário válido para banir.");
            }
        } else if (command === 'kick') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                return message.reply("Você não tem permissão para expulsar membros.");
            }
            const user = message.mentions.users.first();
            const reason = args.slice(1).join(' ') || 'Nenhum motivo fornecido';
            if (user) {
                const member = message.guild.members.cache.get(user.id);
                if (member) {
                    member.kick(reason)
                        .then(() => message.channel.send(`${user.tag} foi expulso. Motivo: ${reason}`))
                        .catch(err => message.reply('Não consegui expulsar o membro.'));
                } else {
                    message.reply("Esse usuário não está no servidor.");
                }
            } else {
                message.reply("Mencione um usuário válido para expulsar.");
            }
        } else if (command === 'mute') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.MuteMembers)) {
                return message.reply("Você não tem permissão para silenciar membros.");
            }
            const user = message.mentions.users.first();
            const time = args[1] ? parseInt(args[1]) * 60000 : 0; // Tempo em minutos
            if (user) {
                const member = message.guild.members.cache.get(user.id);
                if (member) {
                    member.timeout(time, 'Silenciado pelo comando !mute')
                        .then(() => message.channel.send(`${user.tag} foi silenciado por ${args[1]} minutos.`))
                        .catch(err => message.reply('Não consegui silenciar o membro.'));
                } else {
                    message.reply("Esse usuário não está no servidor.");
                }
            } else {
                message.reply("Mencione um usuário válido para silenciar.");
            }
        } else if (command === 'unmute') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.MuteMembers)) {
                return message.reply("Você não tem permissão para remover o silêncio de membros.");
            }
            const user = message.mentions.users.first();
            if (user) {
                const member = message.guild.members.cache.get(user.id);
                if (member) {
                    member.timeout(null)
                        .then(() => message.channel.send(`${user.tag} não está mais silenciado.`))
                        .catch(err => message.reply('Não consegui remover o silêncio do membro.'));
                } else {
                    message.reply("Esse usuário não está no servidor.");
                }
            } else {
                message.reply("Mencione um usuário válido para remover o silêncio.");
            }
        } else if (command === 'warn') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                return message.reply("Você não tem permissão para avisar membros.");
            }
            const user = message.mentions.users.first();
            const reason = args.slice(1).join(' ') || 'Nenhum motivo fornecido';
            if (user) {
                message.channel.send(`${user.tag} foi avisado. Motivo: ${reason}`);
            } else {
                message.reply("Mencione um usuário válido para avisar.");
            }
        } else {
            message.channel.send("Não conheço esse comando.");
        }
        return; // Sai da função para que a API da Cohere não seja chamada
    }

    // Chama a API da Cohere para gerar uma resposta de IA
     try {
        const cohereResponse = await fetch('https://api.cohere.ai/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'command-xlarge-nightly',
                prompt: userMessage,
                max_tokens: 50,
                temperature: 0.7,
            }),
        });
    
        if (!cohereResponse.ok) {
            throw new Error(`Erro na API da Cohere: ${cohereResponse.statusText}`);
        }
    
        const cohereData = await cohereResponse.json();
    
        // Verifique a resposta completa
        console.log('Resposta da API da Cohere:', cohereData);
    
        // Verifique se a resposta contém a propriedade `text`
        if (!cohereData.text) {
            throw new Error('A resposta da API não contém o texto esperado.');
        }
    
        const botResponse = cohereData.text.trim();
        message.channel.send(botResponse);
    } catch (error) {
        console.error('Erro ao chamar a API da Cohere:', error);
        message.channel.send('Houve um erro ao processar sua solicitação.');
    }

client.login(process.env.DISCORD_TOKEN);
console.log('COHERE_API_KEY:', process.env.COHERE_API_KEY);
