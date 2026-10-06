import sql from "mssql";

declare global {
  var adminMssqlPool: Promise<sql.ConnectionPool> | undefined;
}

export type AdminAlimtalkTemplate = {
  senderKey: string;
  templateCode: string;
  message: string;
  title: string;
  targetUrl: string;
  buttonName: string;
  senderNumber: string;
};

type AlimtalkSendInput = {
  recipientPhone: string;
  template: AdminAlimtalkTemplate;
};

export function getAdminAlimtalkTemplate(): AdminAlimtalkTemplate | null {
  const senderKey = process.env.ADMIN_ALIMTALK_SENDER_KEY?.trim() || "";
  const templateCode = process.env.ADMIN_ALIMTALK_TEMPLATE_CODE?.trim() || "";
  const message = decodeEnvLineBreaks(process.env.ADMIN_ALIMTALK_MESSAGE?.trim() || "");

  if (!senderKey || !templateCode || !message || !hasMssqlConfig()) return null;

  return {
    senderKey,
    templateCode,
    message,
    title: process.env.ADMIN_ALIMTALK_TITLE?.trim() || "공부엉이 안내",
    targetUrl: process.env.ADMIN_ALIMTALK_TARGET_URL?.trim() || "",
    buttonName: process.env.ADMIN_ALIMTALK_BUTTON_NAME?.trim() || "확인",
    senderNumber: process.env.ADMIN_ALIMTALK_SMS_SENDER_NUMBER?.trim() || "02-1577-9577",
  };
}

export async function sendAdminAlimtalk({ recipientPhone, template }: AlimtalkSendInput) {
  const phone = normalizePhone(recipientPhone);
  if (!phone) throw new Error("phone_missing");

  const pool = await getMssqlPool();
  const request = pool.request();
  request.input("senderKey", sql.VarChar(100), template.senderKey);
  request.input("phone", sql.VarChar(30), phone);
  request.input("templateCode", sql.VarChar(100), template.templateCode);
  request.input("message", sql.NVarChar(sql.MAX), template.message);
  request.input("title", sql.NVarChar(200), template.title);
  request.input("senderNumber", sql.VarChar(30), template.senderNumber);
  request.input("attachment", sql.NVarChar(sql.MAX), createAttachment(template));

  await request.query(`
    INSERT INTO dbo.MZSENDTRAN (
      SN,
      SENDER_KEY,
      CHANNEL,
      SND_TYPE,
      PHONE_NUM,
      TMPL_CD,
      SND_MSG,
      REQ_DTM,
      SMS_SND_YN,
      SMS_SND_MSG,
      SLOT1,
      SMS_SND_NUM,
      ATTACHMENT
    ) VALUES (
      (next value for mzsendtran_seq),
      @senderKey,
      'A',
      'P',
      @phone,
      @templateCode,
      @message,
      convert(varchar(8), getdate(), 112) + replace(convert(varchar(8), getdate(), 108), ':', ''),
      'N',
      @message,
      @title,
      @senderNumber,
      @attachment
    )
  `);
}

function getMssqlPool() {
  if (!globalThis.adminMssqlPool) {
    const pool = new sql.ConnectionPool(getMssqlConfig());
    globalThis.adminMssqlPool = pool.connect().catch((error) => {
      globalThis.adminMssqlPool = undefined;
      throw error;
    });
  }

  return globalThis.adminMssqlPool;
}

function getMssqlConfig(): sql.config {
  const server = process.env.MSSQL_SERVER?.trim();
  const database = process.env.MSSQL_DATABASE?.trim();
  const user = process.env.MSSQL_USER?.trim();
  const password = process.env.MSSQL_PASSWORD;

  if (!server || !database || !user || !password) {
    throw new Error("mssql_config_missing");
  }

  return {
    server,
    database,
    user,
    password,
    options: {
      encrypt: process.env.MSSQL_ENCRYPT === "true",
      trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERTIFICATE !== "false",
    },
  };
}

function hasMssqlConfig() {
  return Boolean(
    process.env.MSSQL_SERVER?.trim() &&
      process.env.MSSQL_DATABASE?.trim() &&
      process.env.MSSQL_USER?.trim() &&
      process.env.MSSQL_PASSWORD,
  );
}

function createAttachment(template: AdminAlimtalkTemplate) {
  if (!template.targetUrl) return null;

  return JSON.stringify({
    button: [
      {
        name: template.buttonName,
        type: "WL",
        url_mobile: template.targetUrl,
        url_pc: template.targetUrl,
      },
    ],
  });
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function decodeEnvLineBreaks(value: string) {
  return value.replace(/\\n/g, "\n");
}
