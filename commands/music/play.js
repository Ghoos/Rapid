const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const yt_search = require('youtube-search');
const config = require('../../config.json');

const opts = {
    maxResults: 10,
    key: config.YT_API
};

exports.run = async (bot,message,args) => {
    const guild = message.guild.id;

    const play = async (connection,link) => {
        const playing = bot.playing[`${guild}`];

        let dispatcher;

        if(!playing){
            dispatcher = connection.play(ytdl(link.link, { filter: 'audioonly' }));
            bot.dispatcher[`${guild}`] = dispatcher;
            bot.playing[`${guild}`] = link;
        } else {
            dispatcher = connection.play(ytdl(playing.link, { filter: 'audioonly' }));
            bot.dispatcher[`${guild}`] = dispatcher;
        }

        dispatcher.on('start', () => {
            console.log('audio.mp3 is now playing!');

            const playing_message = new Discord.MessageEmbed()
                .setTitle(link.title)
                .setColor("#ff0015")
                .setAuthor('Rapid Bot', 'https://cdn.discordapp.com/app-icons/734154625845952694/8261474e8963b9e62bf19159ca52dcea.png', 'https://discord.com/oauth2/authorize?client_id=734154625845952694&permissions=8&scope=bot')
                .setURL(link.link)
                .setDescription(`Tocando no canal de voz: ${connection.channel.name}`)
                .setThumbnail(link.thumbnails.high.url)
                .addFields(
                    { name: 'Canal', value: link ? link.channelTitle : 'None' },
                    { name: 'Descrição', value: link ? link.channelTitle : 'None' }
                )
                .setFooter(`Selecionado por ${message.author.username}`,message.author.avatarURL());

            message.channel.send(playing_message);
        });
        
        dispatcher.on('finish', () => {
            if (!bot.loop[`${guild}`]){
                const next = bot.queue[`${guild}`].shift();
                bot.playing[`${guild}`] = false;
                
                if(next){
                    play(connection,next);
                } else {
                    message.member.voice.channel.leave();
                }
            } else {
                play(connection,bot.playing[`${guild}`]);
            }
        });
        
        // Always remember to handle errors appropriately!
        dispatcher.on('error', console.error);
    }

    if(!args[0]) return message.channel.send("Digite o link da música. Ex: r!play https://www.youtube.com/watch?v=KJrdDg");
    if(!message.member.voice.channel) return message.channel.send("Você deve estar em um canal de voz!");

    const voice_channel = message.member.voice.channel;

    if (bot.playing[`${guild}`]) {
        if (!args[0].startsWith('http')){
            let results;
            try{
                results = (await yt_search(args.join(separator=' '),opts)).results;
            } catch (err) {
                const error_message = new Discord.MessageEmbed()
                    .setTitle("Error")
                    .setColor("#ff0015")
                    .setAuthor('Rapid Bot', 'https://cdn.discordapp.com/app-icons/734154625845952694/8261474e8963b9e62bf19159ca52dcea.png', 'https://discord.com/oauth2/authorize?client_id=734154625845952694&permissions=8&scope=bot')
                    .setURL(music.link)
                    .setDescription(`Erro ao buscar a música!\nPor favor tente colocar o link da música`)
                    .setFooter(`Selecionado por ${message.author.username}`,message.author.avatarURL());
                return message.channel.send(error_message);
            }
            if (!results[0]) return message.channel.send("Nenhum resultado encontrado!");

            let music = results[0];

            if (music.link.includes('playlist')){
                music = results[1];
            }

            const queue_message = new Discord.MessageEmbed()
                .setTitle(music.title)
                .setColor("#ff0015")
                .setAuthor('Rapid Bot', 'https://cdn.discordapp.com/app-icons/734154625845952694/8261474e8963b9e62bf19159ca52dcea.png', 'https://discord.com/oauth2/authorize?client_id=734154625845952694&permissions=8&scope=bot')
                .setURL(music.link)
                .setDescription(`Adicionado a fila de reprodução!`)
                .setThumbnail(music.thumbnails.high.url)
                .addFields(
                    { name: 'Canal', value: music ? music.channelTitle : 'None' },
                    { name: 'Descrição', value: music ? music.description : 'None'}
                )
                .setFooter(`Selecionado por ${message.author.username}`,message.author.avatarURL());

            bot.queue[`${guild}`].push(music);
            return message.channel.send(queue_message);

        } else {
            let results;
            try{
                results = (await yt_search(args[0],opts)).results;
            } catch (err) {
                const error_message = new Discord.MessageEmbed()
                    .setTitle("Error")
                    .setColor("#ff0015")
                    .setAuthor('Rapid Bot', 'https://cdn.discordapp.com/app-icons/734154625845952694/8261474e8963b9e62bf19159ca52dcea.png', 'https://discord.com/oauth2/authorize?client_id=734154625845952694&permissions=8&scope=bot')
                    .setDescription(`Erro ao buscar a música!\nPor favor tente colocar o link da música`)
                    .setFooter(`Selecionado por ${message.author.username}`,message.author.avatarURL());
                return message.channel.send(error_message);
            }
            if (!results[0]) return message.channel.send("Nenhum resultado encontrado!");

            const queue_message = new Discord.MessageEmbed()
                .setTitle(results[0].title)
                .setColor("#ff0015")
                .setAuthor('Rapid Bot', 'https://cdn.discordapp.com/app-icons/734154625845952694/8261474e8963b9e62bf19159ca52dcea.png', 'https://discord.com/oauth2/authorize?client_id=734154625845952694&permissions=8&scope=bot')
                .setURL(results[0].link)
                .setDescription(`Adicionado a fila de reprodução!`)
                .setThumbnail(results[0].thumbnails.high.url)
                .addFields(
                    { name: 'Canal', value: results[0] ? results[0].channelTitle : 'None' },
                    { name: 'Descrição', value: results[0] ? results[0].description : 'None' },
                )
                .setFooter(`Selecionado por ${message.author.username}`,message.author.avatarURL());

            bot.queue[`${guild}`].push(results[0]);
            return message.channel.send(queue_message);
        }
    }

    const connection = await voice_channel.join();
    bot.queue[`${guild}`] = [];

    const {results} = await yt_search(args.join(separator=' '),opts);
    if (!results[0]) return message.channel.send("Nenhum resultado encontrado!");

    try{
        play(connection,results[0]);
    } catch (err) {
        const error_message = new Discord.MessageEmbed()
        .setTitle("Error")
        .setColor("#ff0015")
        .setAuthor('Rapid Bot', 'https://cdn.discordapp.com/app-icons/734154625845952694/8261474e8963b9e62bf19159ca52dcea.png', 'https://discord.com/oauth2/authorize?client_id=734154625845952694&permissions=8&scope=bot')
        .setURL(results[0].link)
        .setThumbnail(results[0].thumbnails.high.url)
        .setDescription(`Erro ao tocar a música!`)
        .setFooter(`Selecionado por ${message.author.username}`,message.author.avatarURL());
        
        return message.channel.send(error_message);
    }
};