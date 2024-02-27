import { Controller, Get, Param } from '@nestjs/common';
import { NetworkService } from './network.service';
import { ApiTags } from '@nestjs/swagger';

@Controller('LoL')
@ApiTags('LoL Api')
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Get('summoner/:gameName/:tagLine')
  async getAccountByRiotId(
    @Param('gameName') gameName: string,
    @Param('tagLine') tagLine: string,
  ) {
    return this.networkService.getAccountByRiotId(gameName, tagLine);
  }

  @Get('summoner/:puuid')
  async getAccountBypuuid(@Param('puuid') puuid: string) {
    return this.networkService.getAccountBypuuid(puuid);
  }

  @Get('match/:puuid')
  async getMatchId(@Param('puuid') puuid: string) {
    return this.networkService.getMatchId(puuid);
  }

  @Get('matchinfo/:matchId')
  async getMatchInfo(@Param('matchId') matchId: string) {
    return this.networkService.getMatchInfo(matchId);
  }

  @Get('alldata/:gameName/:tagLine')
  async alldata(
    @Param('gameName') gameName: string,
    @Param('tagLine') tagLine: string,
  ) {
    return this.networkService.alldata(gameName, tagLine);
  }
}
