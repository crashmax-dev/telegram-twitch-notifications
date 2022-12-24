import { MigrationInterface, QueryRunner } from 'typeorm'

export class init1671866207121 implements MigrationInterface {
  name = 'init1671866207121'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "stream" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "channelId" integer NOT NULL, "messageId" integer NOT NULL)`
    )
    await queryRunner.query(
      `CREATE TABLE "channel" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "channelId" varchar NOT NULL, "topicId" integer NOT NULL, CONSTRAINT "UQ_ce6adfd740251275f50001afe68" UNIQUE ("channelId"))`
    )
    await queryRunner.query(
      `CREATE TABLE "token" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "accessToken" varchar NOT NULL, "refreshToken" varchar NOT NULL, "expiresIn" integer NOT NULL, "obtainmentTimestamp" integer NOT NULL)`
    )
    await queryRunner.query(
      `CREATE TABLE "temporary_stream" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "channelId" integer NOT NULL, "messageId" integer NOT NULL, CONSTRAINT "FK_3f6374a1c1282a0d3624361dece" FOREIGN KEY ("channelId") REFERENCES "channel" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`
    )
    await queryRunner.query(
      `INSERT INTO "temporary_stream"("id", "channelId", "messageId") SELECT "id", "channelId", "messageId" FROM "stream"`
    )
    await queryRunner.query(`DROP TABLE "stream"`)
    await queryRunner.query(`ALTER TABLE "temporary_stream" RENAME TO "stream"`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stream" RENAME TO "temporary_stream"`)
    await queryRunner.query(
      `CREATE TABLE "stream" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "channelId" integer NOT NULL, "messageId" integer NOT NULL)`
    )
    await queryRunner.query(
      `INSERT INTO "stream"("id", "channelId", "messageId") SELECT "id", "channelId", "messageId" FROM "temporary_stream"`
    )
    await queryRunner.query(`DROP TABLE "temporary_stream"`)
    await queryRunner.query(`DROP TABLE "token"`)
    await queryRunner.query(`DROP TABLE "channel"`)
    await queryRunner.query(`DROP TABLE "stream"`)
  }
}
