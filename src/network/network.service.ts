import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { RedisClientType } from 'redis';

@Injectable()
export class NetworkService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject('REDIS') private readonly redisClient: RedisClientType,
  ) {}

  async getAccountByRiotId(gameName: string, tagLine: string) {
    const url = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`;
    return this.httpService.axiosRef
      .get(url, {
        headers: {
          'X-Riot-Token': this.configService.get<string>('X_RIOT_TOKEN'),
        },
      })
      .then((res) => res.data['puuid'])
      .catch((err) => {
        throw new Error(
          err?.message + ': ' + JSON.stringify(err?.response?.data),
        );
      });
  }

  async getAccountBypuuid(puuid: string) {
    const url = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}`;
    return this.httpService.axiosRef
      .get(url, {
        headers: {
          'X-Riot-Token': this.configService.get<string>('X_RIOT_TOKEN'),
        },
      })
      .then((res) => res.data)
      .catch((err) => {
        throw new Error(
          err?.message + ': ' + JSON.stringify(err?.response?.data),
        );
      });
  }

  async getMatchId(puuid: string) {
    const url = `https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=20`;
    return this.httpService.axiosRef
      .get(url, {
        headers: {
          'X-Riot-Token': this.configService.get<string>('X_RIOT_TOKEN'),
        },
      })
      .then((res) => res.data)
      .catch((err) => {
        throw new Error(
          err?.message + ': ' + JSON.stringify(err?.response?.data),
        );
      });
  }

  async getMatchInfo(matchId: string) {
    //const url = `https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`;

    const url = `https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}`;
    return this.httpService.axiosRef
      .get(url, {
        headers: {
          'X-Riot-Token': this.configService.get<string>('X_RIOT_TOKEN'),
        },
      })
      .then((res) => res.data)
      .catch((err) => {
        throw new Error(
          err?.message + ': ' + JSON.stringify(err?.response?.data),
        );
      });
  }

  async alldata(gameName: string, tagLine: string) {
    let total_inhibitor;
    let total_turret;
    let total_gold;
    let total_kill;
    let cnt;
    const data_puuid = await this.getAccountByRiotId(gameName, tagLine);
    const data_matchid = await this.getMatchId(data_puuid);
    const data_matchinfo = await this.getMatchInfo(data_matchid[0]);

    const gameInfo = data_matchinfo['info'];

    const time = gameInfo['gameDuration'];

    let result = '';
    if (gameInfo['gameMode'] == 'ARAM') {
      result += '무작위 총력전\n\n';
      result +=
        '게임 시간 : ' +
        Math.floor(time / 60) +
        '분 ' +
        (time % 60) +
        '초' +
        '\n\n';
      cnt = 0;
      total_kill = 0;
      total_gold = 0;
      total_turret = 0;
      total_inhibitor = 0;

      for (const participant of gameInfo['participants']) {
        result +=
          participant['riotIdGameName'] +
          '#' +
          participant['riotIdTagline'] +
          '\n';
        if (cnt == 5) {
          total_gold = 0;
          total_kill = 0;
          total_turret = 0;
          total_inhibitor = 0;
        }
        result +=
          `kda: ${participant['kills']}/${participant['deaths']}/${participant['assists']}` +
          ` (${participant['challenges']['kda'].toFixed(2)})` +
          `\n`;
        total_kill += participant['kills'];

        result += `챔피언에게 가한 피해량: ${participant['totalDamageDealtToChampions']}\n`;

        result += `챔피언에게 받은 피해량: ${participant['totalDamageTaken']}\n`;

        result += `얻은 골드: ${participant['goldEarned']}\n`;
        total_gold += participant['goldEarned'];

        result += `cs: ${participant['totalMinionsKilled']} (분당 ${(participant['totalMinionsKilled'] / (time / 60)).toFixed(1)})\n`;
        result += '아이템: ';

        const itemnum = ['item1', 'item2', 'item3', 'item4', 'item5', 'item6'];
        const itemValue = participant['item0'];
        const itemAsString = String(itemValue);
        result += await this.redisClient.hGet('items', itemAsString);
        for (const i of itemnum) {
          if (participant[i] != 0) {
            const item2Value = participant[i];
            const item2AsString = String(item2Value);
            result +=
              ', ' + (await this.redisClient.hGet('items', item2AsString));
          }
        }

        result += '\n주요 룬 - ';
        const styleValue = participant['perks']['styles'][0]['style'];
        const styleAsString = String(styleValue);
        result += (await this.redisClient.hGet('items', styleAsString)) + ' : ';

        const numlist = [0, 1, 2, 3];
        for (const i of numlist) {
          if (i != 0) {
            result += ', ';
          }
          const style2Value =
            participant['perks']['styles'][0]['selections'][i]['perk'];
          const style2AsString = String(style2Value);
          result += await this.redisClient.hGet('items', style2AsString);

          if (i == 3) {
            result += '\n';
          }
        }
        const style3Value = participant['perks']['styles'][1]['style'];
        const style3AsString = String(style3Value);
        result +=
          '보조 룬 - ' +
          (await this.redisClient.hGet('items', style3AsString)) +
          ' : ';
        const numlist2 = [0, 1];
        for (const i of numlist2) {
          const style4Value =
            participant['perks']['styles'][1]['selections'][i]['perk'];
          const style4AsString = String(style4Value);
          if (i != 0) {
            result += ', ';
          }
          result += await this.redisClient.hGet('items', style4AsString);
        }

        total_turret += participant['turretKills'];
        total_inhibitor += participant['inhibitorKills'];
        result += '\n\n';
        if (cnt == 4 || cnt == 9) {
          if (participant['win'] == true) {
            result += '승리\n';
          } else {
            result += '패배\n';
          }
          result += `team total turret kill: ${total_turret}\nteam total inhibitor kill: ${total_inhibitor}\nteam total kill: ${total_kill}\nteam total gold: ${total_gold}\n\n`;
          if (cnt == 4) {
            result +=
              '----------------------------------------------------------\n\n';
          }
        }
        cnt += 1;
      }
      return result;
      // (
      //   result +
      //   '<img src="https://opgg-static.akamaized.net/meta/images/lol/14.3.1/champion/MissFortune.png">'
      // );
    } else if (gameInfo['gameMode'] == 'ARAM') {
      result += '무작위 총력전\n\n';
      result +=
        '게임 시간 : ' +
        Math.floor(time / 60) +
        '분 ' +
        (time % 60) +
        '초' +
        '\n\n';
      cnt = 0;
      total_kill = 0;
      total_gold = 0;
      total_turret = 0;
      total_inhibitor = 0;

      for (const participant of gameInfo['participants']) {
        result +=
          participant['riotIdGameName'] +
          '#' +
          participant['riotIdTagline'] +
          '\n';
        if (cnt == 5) {
          total_gold = 0;
          total_kill = 0;
          total_turret = 0;
          total_inhibitor = 0;
        }
        result +=
          `kda: ${participant['kills']}/${participant['deaths']}/${participant['assists']}` +
          ` (${participant['challenges']['kda'].toFixed(2)})` +
          `\n`;
        total_kill += participant['kills'];

        result += `챔피언에게 가한 피해량: ${participant['totalDamageDealtToChampions']}\n`;

        result += `챔피언에게 받은 피해량: ${participant['totalDamageTaken']}\n`;

        result += `얻은 골드: ${participant['goldEarned']}\n`;
        total_gold += participant['goldEarned'];

        result += `cs: ${participant['totalMinionsKilled']} (분당 ${(participant['totalMinionsKilled'] / (time / 60)).toFixed(1)})\n`;
        result += '아이템: ';

        const itemnum = ['item1', 'item2', 'item3', 'item4', 'item5', 'item6'];
        const itemValue = participant['item0'];
        const itemAsString = String(itemValue);
        result += await this.redisClient.hGet('items', itemAsString);
        for (const i of itemnum) {
          if (participant[i] != 0) {
            const item2Value = participant[i];
            const item2AsString = String(item2Value);
            result +=
              ', ' + (await this.redisClient.hGet('items', item2AsString));
          }
        }

        result += '\n주요 룬 - ';
        const styleValue = participant['perks']['styles'][0]['style'];
        const styleAsString = String(styleValue);
        result += (await this.redisClient.hGet('items', styleAsString)) + ' : ';

        const numlist = [0, 1, 2, 3];
        for (const i of numlist) {
          if (i != 0) {
            result += ', ';
          }
          const style2Value =
            participant['perks']['styles'][0]['selections'][i]['perk'];
          const style2AsString = String(style2Value);
          result += await this.redisClient.hGet('items', style2AsString);

          if (i == 3) {
            result += '\n';
          }
        }
        const style3Value = participant['perks']['styles'][1]['style'];
        const style3AsString = String(style3Value);
        result +=
          '보조 룬 - ' +
          (await this.redisClient.hGet('items', style3AsString)) +
          ' : ';
        const numlist2 = [0, 1];
        for (const i of numlist2) {
          const style4Value =
            participant['perks']['styles'][1]['selections'][i]['perk'];
          const style4AsString = String(style4Value);
          if (i != 0) {
            result += ', ';
          }
          result += await this.redisClient.hGet('items', style4AsString);
        }

        total_turret += participant['turretKills'];
        total_inhibitor += participant['inhibitorKills'];
        result += '\n\n';
        if (cnt == 4 || cnt == 9) {
          if (participant['win'] == true) {
            result += '승리\n';
          } else {
            result += '패배\n';
          }
          result += `team total turret kill: ${total_turret}\nteam total inhibitor kill: ${total_inhibitor}\nteam total kill: ${total_kill}\nteam total gold: ${total_gold}\n\n`;
          if (cnt == 4) {
            result +=
              '----------------------------------------------------------\n\n';
          }
        }
        cnt += 1;
      }
      return result;
      // (
      //   result +
      //   '<img src="https://opgg-static.akamaized.net/meta/images/lol/14.3.1/champion/MissFortune.png">'
      // );
    }
  }
}
