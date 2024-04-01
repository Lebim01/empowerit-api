import { Injectable } from '@nestjs/common';
import { db as admin } from '../firebase/admin';
import dayjs, { Dayjs } from 'dayjs';
import { ranks_object } from './ranks_object';
import { GoogletaskService } from '../googletask/googletask.service';
import { google } from '@google-cloud/tasks/build/protos/protos';

export enum Ranks {
  NONE = 'none',
  INITIAL_BUILD = 'initial_builder',
  STAR_BUILD = 'star_builder',
  ADVANCED_BUILDER = 'advanced_builder',
  MASTER_1000 = 'master_1000',
  MASTER_1500 = 'master_1500',
  MASTER_2500 = 'master_2500',
  REGIONAL_DIRECTOR = 'regional_director',
  NATIONAL_DIRECTOR = 'national_director',
  INTERNATIONAL_DIRECTOR = 'international_director',
  TOP_DIAMOND = 'top_diamond',
  TOP_1 = 'top_1',
  TOP_LEGEND = 'top_legend',
}

const ranksPoints: Record<Ranks, number> = {
  [Ranks.TOP_LEGEND]: 2_300_000,
  [Ranks.TOP_1]: 600_000,
  [Ranks.TOP_DIAMOND]: 180_000,
  [Ranks.INTERNATIONAL_DIRECTOR]: 72_000,
  [Ranks.NATIONAL_DIRECTOR]: 35_000,
  [Ranks.REGIONAL_DIRECTOR]: 25_000,
  [Ranks.MASTER_2500]: 15_000,
  [Ranks.MASTER_1500]: 12_000,
  [Ranks.MASTER_1000]: 8_000,
  [Ranks.ADVANCED_BUILDER]: 6_000,
  [Ranks.STAR_BUILD]: 1_500,
  [Ranks.INITIAL_BUILD]: 500,
  [Ranks.NONE]: 0,
};

export const ranksOrder = [
  Ranks.INITIAL_BUILD,
  Ranks.STAR_BUILD,
  Ranks.ADVANCED_BUILDER,
  Ranks.MASTER_1000,
  Ranks.MASTER_1500,
  Ranks.MASTER_2500,
  Ranks.REGIONAL_DIRECTOR,
  Ranks.NATIONAL_DIRECTOR,
  Ranks.INTERNATIONAL_DIRECTOR,
  Ranks.TOP_DIAMOND,
  Ranks.TOP_1,
  Ranks.TOP_LEGEND,
];

type UserRank = {
  rank?: Ranks;
  order: number;
};

@Injectable()
export class RanksService {
  constructor(private readonly googleTaskService: GoogletaskService) {}

  async updateRank() {
    /* Obtener todos los usuraios */
    const users = await admin.collection('users').get();

    await Promise.all(
      users.docs.map(async (user) => {
        type Method = 'POST';
        const task: google.cloud.tasks.v2.ITask = {
          httpRequest: {
            httpMethod: 'POST' as Method,
            url: `https://${process.env.VERCEL_URL}/ranks/updateUserRank/${user.id}`,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        };

        await this.googleTaskService.addToQueue(
          task,
          this.googleTaskService.getPathQueue('user-rank'),
        );
      }),
    );

    console.log(users.size, 'usuarios');

    return 'OK';
  }

  async registerHistoryUserRank(
    year: number,
    month: number,
    userId: string,
    rank: UserRank,
  ) {
    const user = await admin.collection('users').doc(userId).get();
    const past_max_rank: UserRank = user.get('max_rank')
      ? ranks_object[user.get('max_rank')]
      : {
          order: -1,
        };
    /**
     * Is true when max_rank is lower than new rank
     */
    const is_new_max_rank = past_max_rank.order < rank.order;

    await admin.collection('ranks').doc(`${year}-${month}`).set({
      created_at: new Date(),
    });
    await admin
      .collection('ranks')
      .doc(`${year}-${month}`)
      .collection('users')
      .doc(userId)
      .set({
        past_max_rank: past_max_rank,
        current_rank: rank,
        new_max_rank: is_new_max_rank ? past_max_rank : rank,
        new_rank: is_new_max_rank,
      });

    if (is_new_max_rank) {
      await admin
        .collection('users')
        .doc(userId)
        .collection('rank-promotion')
        .add({
          created_at: new Date(),
          rank: rank.rank || Ranks.INITIAL_BUILD,
        });
      await admin.collection('rank-promotion').add({
        id_user: userId,
        name: user.get('name') || '',
        created_at: new Date(),
        rank: rank.rank || Ranks.INITIAL_BUILD,
      });
    }
  }

  async updateUserRank(id_user: string) {
    const rankData = await this.getRankUser(id_user);

    const start = dayjs().add(-1, 'day').utcOffset(-6).startOf('month');
    const end = dayjs().add(-1, 'day').utcOffset(-6).endOf('month');

    const points = await this.getPoints(id_user, start, end);

    await this.registerHistoryUserRank(
      start.year(),
      start.month(),
      id_user,
      rankData,
    );

    await this.insertRank(
      id_user,
      rankData.rank,
      start.year(),
      start.month(),
      points.left,
      points.right,
    );

    return rankData;
  }

  async getRankUser(userId: string): Promise<UserRank> {
    const start = dayjs().add(-1, 'day').utcOffset(-6).startOf('month');
    const end = dayjs().add(-1, 'day').utcOffset(-6).endOf('month');

    /* Obtener la suma de puntos del ultimo mes */
    const points = await this.getPoints(userId, start, end);

    /* Crear subcoleccion para el historial de rangos */
    const smaller_leg = points.right > points.left ? 'left' : 'right';
    const points_smaller_leg = points[smaller_leg];
    const rank = await this.getRank(points_smaller_leg);

    return {
      order: rank.order,
      rank: rank.rank,
    };
  }

  async getPoints(
    userId: string,
    start: Dayjs,
    end: Dayjs,
  ): Promise<{ left: number; right: number }> {
    const points = await admin
      .collection('users')
      .doc(userId)
      .collection('points')
      .where('created_at', '>=', start.toDate())
      .where('created_at', '<=', end.toDate())
      .get()
      .then((r) => r.docs.map((d) => d.data()));

    const sumSidePoints =
      (side: 'left' | 'right') =>
      (a: number, b: { side: 'left' | 'right'; points: number }): number => {
        return a + (b.side == side ? b.points : 0);
      };

    const left_points = points.reduce(sumSidePoints('left'), 0);
    const right_points = points.reduce(sumSidePoints('right'), 0);

    return {
      left: left_points,
      right: right_points,
    };
  }

  async getRank(points_smaller_leg: number): Promise<{
    rank: Ranks;
    missing_points: number;
    points_smaller_leg: number;
    next_rank: Ranks;
    order: number;
  }> {
    let rank: Ranks = Ranks.NONE;
    let next_rank: Ranks = Ranks.NONE;
    let missing_points = 0;

    if (points_smaller_leg >= ranksPoints[Ranks.TOP_LEGEND]) {
      rank = Ranks.TOP_LEGEND;
    } else if (points_smaller_leg >= ranksPoints[Ranks.TOP_1]) {
      rank = Ranks.TOP_1;
      missing_points = ranksPoints[Ranks.TOP_LEGEND] - points_smaller_leg;
      next_rank = Ranks.TOP_LEGEND;
    } else if (points_smaller_leg >= ranksPoints[Ranks.TOP_DIAMOND]) {
      rank = Ranks.TOP_DIAMOND;
      next_rank = Ranks.TOP_1;
      missing_points = 20000 - points_smaller_leg;
    } else if (
      points_smaller_leg >= ranksPoints[Ranks.INTERNATIONAL_DIRECTOR]
    ) {
      rank = Ranks.INTERNATIONAL_DIRECTOR;
      missing_points = ranksPoints[Ranks.TOP_DIAMOND] - points_smaller_leg;
      next_rank = Ranks.TOP_DIAMOND;
    } else if (points_smaller_leg >= ranksPoints[Ranks.NATIONAL_DIRECTOR]) {
      rank = Ranks.NATIONAL_DIRECTOR;
      missing_points =
        ranksPoints[Ranks.INTERNATIONAL_DIRECTOR] - points_smaller_leg;
      next_rank = Ranks.INTERNATIONAL_DIRECTOR;
    } else if (points_smaller_leg >= ranksPoints[Ranks.REGIONAL_DIRECTOR]) {
      rank = Ranks.REGIONAL_DIRECTOR;
      missing_points =
        ranksPoints[Ranks.NATIONAL_DIRECTOR] - points_smaller_leg;
      next_rank = Ranks.NATIONAL_DIRECTOR;
    } else if (points_smaller_leg >= ranksPoints[Ranks.MASTER_2500]) {
      rank = Ranks.MASTER_2500;
      missing_points =
        ranksPoints[Ranks.REGIONAL_DIRECTOR] - points_smaller_leg;
      next_rank = Ranks.REGIONAL_DIRECTOR;
    } else if (points_smaller_leg >= ranksPoints[Ranks.MASTER_1500]) {
      rank = Ranks.MASTER_1500;
      missing_points = ranksPoints[Ranks.MASTER_2500] - points_smaller_leg;
      next_rank = Ranks.MASTER_2500;
    } else if (points_smaller_leg >= ranksPoints[Ranks.MASTER_1000]) {
      rank = Ranks.MASTER_1000;
      missing_points = ranksPoints[Ranks.MASTER_2500] - points_smaller_leg;
      next_rank = Ranks.MASTER_2500;
    } else if (points_smaller_leg >= ranksPoints[Ranks.ADVANCED_BUILDER]) {
      rank = Ranks.ADVANCED_BUILDER;
      missing_points = ranksPoints[Ranks.MASTER_1000] - points_smaller_leg;
      next_rank = Ranks.MASTER_1000;
    } else if (points_smaller_leg >= ranksPoints[Ranks.STAR_BUILD]) {
      rank = Ranks.STAR_BUILD;
      missing_points = ranksPoints[Ranks.ADVANCED_BUILDER] - points_smaller_leg;
      next_rank = Ranks.ADVANCED_BUILDER;
    } else if (points_smaller_leg >= ranksPoints[Ranks.INITIAL_BUILD]) {
      rank = Ranks.INITIAL_BUILD;
      missing_points = ranksPoints[Ranks.STAR_BUILD] - points_smaller_leg;
      next_rank = Ranks.STAR_BUILD;
    } else {
      rank = Ranks.NONE;
      missing_points = ranksPoints[Ranks.INITIAL_BUILD] - points_smaller_leg;
      next_rank = Ranks.INITIAL_BUILD;
    }

    const order = ranksOrder.findIndex((r) => r == rank);

    return {
      rank,
      missing_points,
      points_smaller_leg,
      next_rank,
      order: order ?? -1,
    };
  }

  async insertRank(
    userId: string,
    rank: string,
    year: number,
    month: number,
    left_points: number,
    right_points: number,
  ) {
    try {
      await admin
        .collection('users')
        .doc(userId)
        .collection('rank_history')
        .doc(`${year}-${month}`)
        .set({
          rank,
          left_points,
          right_points,
        });
    } catch (error) {
      console.error('Error al agregar documento:', error);
    }
  }

  async getRankKey(key: string) {
    return ranks_object[key];
  }

  async newRanks(
    year: string,
    week: string,
    returnType: 'csv' | 'json' = 'json',
  ) {
    const prevWeek = (Number(week) - 1).toString();

    const usersPrev = await admin
      .collection('ranks')
      .doc(`${year}-${prevWeek}`)
      .collection('users')
      .get();

    const usersNew = await admin
      .collection('ranks')
      .doc(`${year}-${week}`)
      .collection('users')
      .get();

    const response = [];

    for (const newRank of usersNew.docs) {
      if (
        !['vanguard', 'scholarship'].includes(newRank.get('new_max_rank.key'))
      ) {
        const pastRank = usersPrev.docs.find((r) => r.id == newRank.id);

        if (
          pastRank.get('new_max_rank.key') != newRank.get('new_max_rank.key')
        ) {
          const user = await admin.collection('users').doc(newRank.id).get();
          const sponsor = await admin
            .collection('users')
            .doc(user.get('sponsor_id'))
            .get();
          response.push({
            past_rank: pastRank.get('new_max_rank.display'),
            new_rank: newRank.get('new_max_rank.display'),
            name: user.get('name'),
            email: user.get('email'),
            id: user.id,
            sponsor: sponsor.get('name'),
            sponsor_email: sponsor.get('email'),
          });
        }
      }
    }

    return returnType == 'json'
      ? response
      : [
          'ID,NOMBRE,EMAIL,PATROCINADOR,PATROCINADOR EMAIL,RANGO PASADO,NUEVO RANGO',
          ...response.map((r) =>
            [
              r.id,
              r.name,
              r.email,
              r.sponsor,
              r.sponsor_email,
              r.past_rank,
              r.new_rank,
            ].join(','),
          ),
        ].join('\n');
  }
}
