import { scrapeFrembed } from "./fr/frembed";
import { scrapeKinokiste } from "./de/kinokiste";
import { scrapeMeinecloud } from "./de/meinecloud";
import { scrapeEurostreaming } from "./it/eurostreaming";
import { scrapeGuardahd } from "./it/guardahd";
import { scrapeVerdahd } from './es/verhdlink'; 
import { scrapeCinehdplus } from './es/cinehdplus';
import { scrapeFrenchcloud } from "./fr/frenchcloud";
import { scrapeDramacool } from "./multilang/dramacool";
import { scrapeSmashystreamLang } from "./multilang/smashystream"
import { scrapeGogoanime } from "./multilang/gogoanime";
import { scrapeBuiltinMovie } from "~/routes/stream/movie/[id]";
import { scrapeBuiltinSeries } from "~/routes/stream/series/[id]";;

import 'dotenv/config'
import { getCache, setCache } from "~/functions/caching";
import { timeout } from "~/functions/built_in_wrapper";
const disabled_providers = process.env.disabled_custom_providers || '';
const timeoutTime = parseInt(process.env.provider_timeout) || 10000;
const scrape_custom_providers = process.env.scrape_custom_providers || 'true';
const scrape_built_in = process.env.scrape_built_in || 'true';

const movies: Map<string, (imdbid: string, media?: any) => Promise<any>> = new Map([
    ["frembed", async (imdbid: string) => await scrapeFrembed(imdbid, 0, 0)],
    ["meinecloud", async (imdbid: string) => await scrapeMeinecloud(imdbid)],
    ["guardahd", async (imdbid: string) => await scrapeGuardahd(imdbid)],
    ["verhdlink", async (imdbid: string) => await scrapeVerdahd(imdbid)],
    ["frenchcloud", async (imdbid: string) => await scrapeFrenchcloud(imdbid)],
    ["smashystreamtr", async (imdbid: string) => await scrapeSmashystreamLang(imdbid, '0', '0', "Turkish")],
    ["smashystreamhi", async (imdbid: string) => await scrapeSmashystreamLang(imdbid, '0', '0', "Hindi")],
    //["goquick", async (imdbid: string) => await scrapeGoquick(imdbid, 0, 0)],
]);

const series = new Map<string, (imdbid: string, season: string, episode: string, media?: any) => Promise<any>>([
    ["kinokiste", async (imdbid: string, season: string, episode: string) => await scrapeKinokiste(imdbid, season, episode)],
    ["cinehdplus", async (imdbid: string, season: string, episode: string) => await scrapeCinehdplus(imdbid, season, episode)],
    ["frembed", async (imdbid: string, season: string, episode: string) => await scrapeFrembed(imdbid, season, episode)],
    ["eurostreaming", async (imdbid: string, season: string, episode: string) => await scrapeEurostreaming(imdbid, season, episode)],
    ["dramacool", async (imdbid: string, season: string, episode: string, media?: any) => await scrapeDramacool(imdbid, season, episode, media)],
    ["smashystreamtr", async (imdbid: string, season: string, episode: string) => await scrapeSmashystreamLang(imdbid, season, episode, "Turkish")],
    ["smashystreamhi", async (imdbid: string, season: string, episode: string) => await scrapeSmashystreamLang(imdbid, season, episode, "Hindi")],
    ["gogoanime", async (id: string, season: string, episode: string, media?: any) => await scrapeGogoanime(id, season, episode, media)],
    //["goquick", async (imdbid: string, season: string, episode: string) => await scrapeGoquick(imdbid, season, episode)],
]);

const info = new Map<string, any>([
    ["frembed", {name: "FRembed", lang_emoji: "🇫🇷"}],
    ["frenchcloud", {name: "Frenchcloud", lang_emoji: "🇫🇷"}],
    ["meinecloud", {name: "Meinecloud", lang_emoji: "🇩🇪"}],
    ["kinokiste", {name: "Kinokiste", lang_emoji: "🇩🇪"}],
    ["cinehdplus", {name: "CineHDplus", lang_emoji: "🇪🇸🇲🇽"}],
    ["verhdlink", {name: "VerHDlink", lang_emoji: "🇪🇸🇲🇽"}],
    ["eurostreaming", {name: "EuroStreaming", lang_emoji: "🇮🇹"}],
    ["guardahd", {name: "GuardaHD", lang_emoji: "🇮🇹"}],
    ["smashystreamtr", {name: "Smashystream TR", lang_emoji: "🇹🇷"}],
    ["smashystreamhi", {name: "Smashystream HI", lang_emoji: "🇮🇳"}],
    ["dramacool", {name: "DramaCool", lang_emoji: "🎭"}],
    ["gogoanime", {name: "Gogoanime", lang_emoji: "🌸"}],
    //["myfilestorage", {name: "Myfilestorage", lang_emoji: "🎥"}],
    //["goquick", {name: "GoQuick", lang_emoji: "🎥"}],
    //["moviesapi", {name: "MoviesAPI", lang_emoji: "🎥"}],
]);

export async function scrapeCustomProviders(list, id, season, episode, media ? ) {
    const output: any = {
        streams: []
    };
    let sourcelist: string[] = list.split(',')
    if (list.includes("built-in") && scrape_built_in == "true") {
        try {
            const streams = episode === 0 ? await scrapeBuiltinMovie(id) : await scrapeBuiltinSeries(`${id}:${season}:${episode}`)

            for (const stream of streams) {
                output.streams.push(stream)
            }
        } catch(err) {
            console.log(err)
        }
    }
    const promises = sourcelist.map(async (source) => {
        const cached = await getCache(source, id, season, episode) 
        if (cached) { return cached; }
        try {
            return Promise.race([
                (async () => {
                    if (source == "built-in" && scrape_built_in == "true") {} else if (disabled_providers.includes(source) != true && scrape_custom_providers == "true") {
                        try {
                            const scrapingFunction = episode === 0 ? await movies.get(source) : await series.get(source)
                            if (typeof scrapingFunction === 'function') {
                                const mediaResults = await scrapingFunction(id, season, episode, media);
                                if (mediaResults != null && Array.isArray(mediaResults)) {
                                    for (let mediaResult of mediaResults) {
                                        output.streams.push(mediaResult)
                                    }
                                }
                            }
                            setCache(source, id, season, episode)
                        } catch (error) {
                            return null;
                        }
                    }
                })(),
                timeout(timeoutTime)
            ])
        } catch {
            return null;
        }
    })
    await Promise.all(promises)
    return (output)
}
export async function buildHTMLselectors() {
    let selector = ''
    if (scrape_built_in == "true") {
        selector = `${selector}       
            <input type="checkbox" id="built-in" name="built-in" value="built-in">
            <label for="built-in">🎥 Built-in Providers</label><br>`
    }
    info.forEach((value, key) => {
        if (disabled_providers.includes(key) != true && scrape_custom_providers == "true") {
            selector = `${selector}       
        <input type="checkbox" id="${key}" name="${key}" value="${key}">
        <label>${value.lang_emoji} ${value.name}</label><br>`
        }
    });
    return (`
        <h3>Configure</h3>
        <form id="language-form">
        ${selector}
    </form>`)
}