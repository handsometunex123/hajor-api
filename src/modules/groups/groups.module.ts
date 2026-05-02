import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { QueueModule } from '../../infrastructure/queue/queue.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { GroupService } from './group.service';
import { GroupContributorService } from './group-contributor.service';
import { GroupJoinService } from './group-join.service';
import { GroupLifecycleService } from './group-lifecycle.service';
import { GroupInviteService } from './group-invite.service';
import { ContributorSwapService } from './contributor-swap.service';
import { GroupController } from './controllers/group.controller';
import { GroupContributorController, ContributorSwapController } from './controllers/group-contributor.controller';
import { GroupJoinController } from './controllers/group-join.controller';
import { GroupInviteController, InviteActionController, PublicInviteController, JoinLinkController, GroupJoinLinkController } from './controllers/group-invite.controller';

@Module({
	imports: [PrismaModule, QueueModule, NotificationsModule, UsersModule, RedisModule, TransactionsModule],
	providers: [GroupService, GroupContributorService, GroupJoinService, GroupLifecycleService, GroupInviteService, ContributorSwapService],
	controllers: [GroupController, GroupContributorController, ContributorSwapController, GroupJoinController, GroupInviteController, GroupJoinLinkController, InviteActionController, PublicInviteController, JoinLinkController],
	exports: [GroupService, GroupContributorService, GroupInviteService],
})
export class GroupsModule {}
