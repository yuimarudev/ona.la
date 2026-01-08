+++
published = "2026-01-08"
title = "EC25-J(+9eSIM)に全部賭けろ"
tags = ["モバイルネットワーク", "ハードウェア", "EC25-J", "9eSIM", "eUICC", "eSIM", "LPA"]

[author]
name = "ゆいまる"
link = "https://github.com/yuimarudev"

[motd]
url = "https://youtu.be/wRBNKv7eRiI"
alternative_image_url = "https://r2.ona.la/404.png"
+++

# はじめに

EC25-J (EC25JFAR06A06M4G), [9eSIM (v3)](https://www.9esim.com/), ModemManager, systemd-networkd, [gnome-calls](https://github.com/droidian/gnome-calls), [chatty](https://gitlab.gnome.org/World/Chatty) を使用してeSIMプロファイルへの書き込みをしたり、インターネットと疎通したり、117への発信・SMSの送受信に成功したので、忘備録として手法を書いていきます。

参考までに、筆者の環境はこのようになっています。
```command:bash
[idolm@ster ~]$ uname -a
Linux ster 6.18.3-zen1-1-zen #1 ZEN SMP PREEMPT_DYNAMIC Fri, 02 Jan 2026 17:52:43 +0000 x86_64 GNU/Linux

[idolm@ster ~]$ mmcli --version
mmcli 1.24.2
Copyright (2011 - 2023) Aleksander Morgado
License GPLv2+: GNU GPL version 2 or later <http://gnu.org/licenses/gpl-2.0.html>
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.

[idolm@ster ~]$ networkctl --version
systemd 259 (259-2-arch)
+PAM +AUDIT -SELINUX +APPARMOR -IMA +IPE +SMACK +SECCOMP +GCRYPT +GNUTLS +OPENSSL +ACL +BLKID +CURL +ELFUTILS +FIDO2 +IDN2 -IDN +KMOD +LIBCRYPTSETUP +LIBCRYPTSETUP_PLUGINS +LIBFDISK +PCRE2 +PWQUALITY +P11KIT +QRENCODE +TPM2 +BZIP2 +LZ4 +XZ +ZLIB +ZSTD +BPF_FRAMEWORK +BTF +XKBCOMMON +UTMP -SYSVINIT +LIBARCHIVE

[idolm@ster ~]$ gnome-calls --version
calls v49.1.1+

[idolm@ster ~]$ chatty --version
chatty v0.8.8
```

# 準備

ModemManagerがインストールされていて、起動されていることを確認してください。また、EC25-JがUSB経由またはmini PCIe経由で接続されていることを確認してください。筆者の環境では、USB経由で接続していることになっています。

```command:bash
[idolm@ster ~]$ systemctl status ModemManager
● ModemManager.service - Modem Manager
     Loaded: loaded (/usr/lib/systemd/system/ModemManager.service; enabled; preset: disabled)
     Active: active (running) since Thu 2026-01-08 10:57:31 JST; 24min ago
```

```command:bash
[idolm@ster ~]$ lspci | grep Quectel

[idolm@ster ~]$ lsusb | grep Quectel
Bus 003 Device 005: ID 2c7c:0125 Quectel Wireless Solutions Co., Ltd. EC25 LTE modem
```

最近の Liunx であれば、特に何も設定せずに認識されるはずです。何も出力されない場合は、自力でドライバを探してください。

次に、mmcli (ModemManager)を使い、ATコマンドを送るべきデバイスファイルを特定します。

```command:bash
[idolm@ster ~]$ mmcli -L # モデムの一覧を取得する
    /org/freedesktop/ModemManager1/Modem/0 [Android] Android

[idolm@ster ~]$ mmcli -m 0 # 指定したインデックスのモデムの詳細を表示する
  --------------------------------
  General  |                 path: /org/freedesktop/ModemManager1/Modem/0
........
  System   |               device: /sys/devices/pci0000:00/0000:00:08.1/0000:64:00.4/usb3/3-1/3-1.2
           |              physdev: /sys/devices/pci0000:00/0000:00:08.1/0000:64:00.4/usb3/3-1/3-1.2
           |              drivers: option, cdc_mbim
           |               plugin: quectel
           |         primary port: cdc-wdm0
           |                ports: cdc-wdm0 (mbim), ttyUSB0 (ignored), ttyUSB1 (gps), 
           |                       ttyUSB2 (at), ttyUSB3 (at), wwan0 (net)
```

この出力では、`ports: cdc-wdm0 (mbim), ttyUSB0 (ignored), ttyUSB1 (gps), ttyUSB2 (at), ttyUSB3 (at), wwan0 (net)` となっており、`ttyUSB2`, `ttyUSB3`がATコマンド用のポートだということがわかります。今回は、`ttyUSB3` (`/dev/ttyUSB3`)を使いATコマンドを送信することにします。

## eSIMプロファイルのダウンロード・書き込み

EC25-JはeSIM(eUICC)をサポートしていませんが、9eSIMや5berなどのアダプターを使用することができます。[lpac](github.com/estkme-group/lpac)というソフトウェアにて、特定のフラグを有効にし環境変数を設定[^1]することによりPC/SCリーダーを使わずにATコマンド経由でモデム単体でのプロファイル操作が可能ですが、プロファイルのダウンロード・アクティベーション時にIMEIを指定した際、Segmentation faultが発生してしまいます。なので、今回は[anzu](https://github.com/yuimarudev/anzu)というソフトウェアを作成しました。まだ試験的なもので、不安定ですが、筆者の環境ではすべての機能を正常に動かすことに成功しました。ほとんどlpac/EasyLPACのRustリライトですが、既存ソフトウェアにある機能以外に、EC25-JでAPDUの通信が不安定になる現象への対策や、デバイスの自動検知、モデムの再起動を行えるインターフェイスをコマンドライン・グラフィカル両方で提供しています。

```command:bash
[idolm@ster ~]$ anzu-cli profile download --help
Usage: anzu-cli profile download [OPTIONS] --activation <ACTIVATION>

Options:
      --activation <ACTIVATION>      Activation code string
      --confirmation <CONFIRMATION>  Optional confirmation code
      --imei <IMEI>                  Optional IMEI to send to SM-DP+
  -h, --help                         Print help
```

```command:bash
# ダウンロードと書き込み
[idolm@ster ~]$ sudo anzu-cli --output-type jsonl-progress profile download --activation 'LPA:1$rakuten.prod.ondemandconnectivity.com$***********'

2026-01-08T05:07:29.291160Z  INFO anzu_core::at::transport: opening AT device device=/dev/ttyUSB3 baud=115200 timeout_ms=5000
{"ts_unix_ms":1767848849000,"phase":"init","message":"download_and_install","counters":{"at_commands":0,"apdu_roundtrips":0,"retries":0}}
{"ts_unix_ms":1767848849000,"phase":"euicc_command","message":"get eUICC challenge","counters":{"at_commands":0,"apdu_roundtrips":0,"retries":0}}
{"ts_unix_ms":1767848849000,"phase":"euicc_command","message":"get eUICC info1","counters":{"at_commands":0,"apdu_roundtrips":0,"retries":0}}
{"ts_unix_ms":1767848849000,"phase":"smdp_connect","message":"initiate authentication","counters":{"at_commands":0,"apdu_roundtrips":0,"retries":0}}
{"ts_unix_ms":1767848850000,"phase":"euicc_command","message":"authenticate server","counters":{"at_commands":0,"apdu_roundtrips":0,"retries":0}}
{"ts_unix_ms":1767848851000,"phase":"smdp_connect","message":"authenticate client","counters":{"at_commands":0,"apdu_roundtrips":0,"retries":0}}
{"ts_unix_ms":1767848851000,"phase":"euicc_command","message":"prepare download","counters":{"at_commands":0,"apdu_roundtrips":0,"retries":0}}
{"ts_unix_ms":1767848851000,"phase":"smdp_download","message":"get bound profile package","counters":{"at_commands":0,"apdu_roundtrips":0,"retries":0}}
{"ts_unix_ms":1767848852000,"phase":"install","message":"install profile","counters":{"at_commands":0,"apdu_roundtrips":0,"retries":0}}
{"ts_unix_ms":1767848865000,"phase":"done","message":"install_bpp success, seq=26","counters":{"at_commands":0,"apdu_roundtrips":0,"retries":0}}
{
  "profile_id": null,
  "message": "install_bpp success, seq=26"
}
```


## apnの設定

筆者は楽天最強プランを使用していますが、あなたの利用キャリア・プランによって記述するべきものが異なる場合があります。

本来、`mmcli --simple-connect ...`を使用して接続する際に指定できますが、なぜか楽天だけこのコマンドだけでは接続できませんでした。ATコマンドによる設定を事前に行う必要がありそうです。[^2]

```command:bash
# 好きなツールを利用してください。screen 等で接続した場合、local echo が有効になっていない場合は自分の打ったコマンドが見えません。
[idolm@ster ~]$ sudo picocom -c /dev/ttyUSB3

AT

OK
AT+CGDCONT=1,"IPV4V6","rakuten.jp"

OK
AT+CGDCONT?

+CGDCONT: 1,"IPV4V6","rakuten.jp","0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0",0,0,0,0
+CGDCONT: 2,"IPV4V6","","0.0.0.0.0.0.0.0.0.0.0.0.
AT+CGDCONT?

+CGDCONT: 1,"IPV4V6","rakuten.jp","0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0",0,0,0,0
+CGDCONT: 2,"IPV4V6","","0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0",0,0,0,0
+CGDCONT: 3,"IPV4V6","ims","0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0",0,0,0,0
+CGDCONT: 4,"IPV4V6","SOS","0.0.0.0.0.0.
AT+CGDCONT?

+CGDCONT: 1,"IPV4V6","rakuten.jp","0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0",0,0,0,0
+CGDCONT: 2,"IPV4V6","","0.0.0.0.0.0.0.0.0.0.0.0.
AT+CGDCONT?

+CGDCONT: 1,"IPV4V6","rakuten.jp","0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0",0,0,0,0
+CGDCONT: 2,"IPV4V6","","0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0",0,0,0,0
+CGDCONT: 3,"IPV4V6","ims","0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0",0,0,0,0
+CGDCONT: 4,"IPV4V6","SOS","0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0",0,0,0,1

OK
```

最初に`AT`を送り接続できているかを確認しています。ここでは、`OK`と返ってきており、正常に通信できていることが確認できます。

次は、`AT+CGDCONT=1,"IPV4V6","rakuten.jp"`というコマンドを送っています。`rakuten.jp`は適宜置き換えてください。`IPV4V6`についてですが、通信できない場合のみ`IP`に置き換えてみてください。

そして、設定されたか確認するために、`AT+CGDCONT?`を送信しています。注意点として、出力が長い場合、最後まで表示されないことがあるので、`OK`が出力されるまで送信する必要があります。また、`3`,`4`が存在しない場合、発信やSMSの送受信ができないので、設定する必要があります。[^3]

```command:bash
# 好きなツールを利用してください。screen 等で接続した場合、local echo が有効になっていないため自分の打ったものが見えない場合があります。
[idolm@ster ~]$ sudo picocom -c /dev/ttyUSB3

AT

OK
AT+CGDCONT=2,"IPV4V6"

OK
AT+CGDCONT=3,"IPV4V6","ims"

OK
AT+CGDCONT=4,"IPV4V6","SOS"

OK
```

# モバイルネットワークに接続する

mmcliを使用します。

```command:bash
[idolm@ster ~]$ mmcli -L # モデムの一覧を取得する
    /org/freedesktop/ModemManager1/Modem/0 [Android] Android

# モデムと apn を指定し、接続を開始する。
[idolm@ster ~]$ mmcli -m 0 --simple-connect "apn=rakuten.jp,ip-type=ipv4v6"
successfully connected the modem at bearer /org/freedesktop/ModemManager1/Bearer/0
```

しかし、これだけではIPアドレスが設定されません。これは筆者がsystemd-networkdを使用していることに起因していると思うので、NetworkManager利用者はArchwikiなどを参照して設定してください。また、systemd v260にて、ModemManagerとの連携が追加予定([systemd/systemd#38855](https://github.com/systemd/systemd/pull/38855), [systemd/systemd milestone v260](https://github.com/systemd/systemd/milestone/37))です。ビルドすれば利用可能だと思われますが、実利用できるか不明であるため試していません。

今回はインターネットに接続することが目的なので、ModemManagerのDBusを購読し、IPアドレスを設定するスクリプトを作成しました。ModemManagerが再起動された際に自動でモバイルネットワークに接続するわけではないので注意が必要です。

```/opt/wwan-mm/wwan-mm-watch.mjs:js
import dbus from "dbus-next";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import crypto from "node:crypto";

const execFileAsync = promisify(execFile);

const BUS_NAME = "org.freedesktop.ModemManager1";
const ROOT = "/org/freedesktop/ModemManager1";

const APN = process.env.APN || "rakuten.jp";
const IPTYPE = process.env.IPTYPE || "ipv4v6";
const IFACE = process.env.IFACE || "wwan0";
const PRIMARY_PORT = process.env.PRIMARY_PORT || "cdc-wdm0";
const METRIC_V4 = process.env.METRIC_V4 || "300";
const METRIC_V6 = process.env.METRIC_V6 || "300";
const POLL_MS = Number(process.env.POLL_MS || "0");
const LOG_LEVEL = process.env.LOG_LEVEL || "info";

const LEVEL = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN = LEVEL[LOG_LEVEL] ?? 20;

function log(level, msg, fields = {}) {
  if ((LEVEL[level] ?? 20) < MIN) return;
  const ts = new Date().toISOString();
  process.stderr.write(JSON.stringify({ ts, level, msg, ...fields }) + "\n");
}

function errInfo(e) {
  if (!e) return {};
  return { name: e.name, message: e.message, stack: e.stack, code: e.code };
}

async function step(name, fn, fields = {}) {
  const t0 = Date.now();
  log("debug", `step.start:${name}`, fields);
  try {
    const r = await fn();
    log("debug", `step.ok:${name}`, { ...fields, ms: Date.now() - t0 });
    return r;
  } catch (e) {
    log("error", `step.fail:${name}`, { ...fields, ms: Date.now() - t0, ...errInfo(e) });
    throw e;
  }
}

function du(x) {
  if (x instanceof dbus.Variant) return du(x.value);
  if (Array.isArray(x)) return x.map(du);
  if (x && typeof x === "object") {
    const o = {};
    for (const [k, v] of Object.entries(x)) o[k] = du(v);
    return o;
  }
  return x;
}

async function sh(cmd, args) {
  const t0 = Date.now();
  log("debug", "exec.start", { cmd, args });
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, { encoding: "utf8" });
    log("debug", "exec.ok", { cmd, args, ms: Date.now() - t0, stdout, stderr });
    return stdout;
  } catch (e) {
    log("error", "exec.fail", { cmd, args, ms: Date.now() - t0, ...errInfo(e) });
    throw e;
  }
}

async function getAllProps(bus, path, iface) {
  const obj = await bus.getProxyObject(BUS_NAME, path);
  const p = obj.getInterface("org.freedesktop.DBus.Properties");
  return du(await p.GetAll(iface));
}

async function modemMatches(bus, modemPath) {
  const props = await getAllProps(bus, modemPath, "org.freedesktop.ModemManager1.Modem");
  if (props.PrimaryPort === PRIMARY_PORT) return true;
  const ports = props.Ports;
  if (Array.isArray(ports)) {
    for (const ent of ports) {
      if (Array.isArray(ent) && String(ent[0]) === PRIMARY_PORT) return true;
    }
  }
  return false;
}

async function modemEnableAndConnect(bus, modemPath) {
  const obj = await bus.getProxyObject(BUS_NAME, modemPath);
  const modem = obj.getInterface("org.freedesktop.ModemManager1.Modem");
  const simple = obj.getInterface("org.freedesktop.ModemManager1.Modem.Simple");
  try {
    await modem.Enable(true);
  } catch (e) {
    log("warn", "modem.enable.error", { modemPath, ...errInfo(e) });
  }
  const dict = {
    "apn": new dbus.Variant("s", APN),
    "ip-type": new dbus.Variant("s", IPTYPE),
  };
  return await simple.Connect(dict);
}

async function bearerRead(bus, bearerPath) {
  const obj = await bus.getProxyObject(BUS_NAME, bearerPath);
  const p = obj.getInterface("org.freedesktop.DBus.Properties");
  const connected = du(await p.Get("org.freedesktop.ModemManager1.Bearer", "Connected"));
  const iface = du(await p.Get("org.freedesktop.ModemManager1.Bearer", "Interface"));
  const ip4 = du(await p.Get("org.freedesktop.ModemManager1.Bearer", "Ip4Config"));
  const ip6 = du(await p.Get("org.freedesktop.ModemManager1.Bearer", "Ip6Config"));
  return { connected: !!connected, iface: iface || "", ip4: ip4 || {}, ip6: ip6 || {} };
}

function norm(cfg) {
  const method = cfg.method ?? cfg.Method;
  const addr = cfg.address ?? cfg.Address;
  const prefix = cfg.prefix ?? cfg.Prefix;
  const gw = cfg.gateway ?? cfg.Gateway;
  const mtu = cfg.mtu ?? cfg.Mtu;
  const dns = cfg.dns ?? cfg.Dns;
  return { method, addr, prefix, gw, mtu, dns };
}

function dnsArgs(dns) {
  if (!dns) return [];
  if (Array.isArray(dns)) return dns.map(String);
  if (typeof dns === "string") return dns.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

function hashConfig(bearerPath, ip4, ip6) {
  const v4 = norm(ip4);
  const v6 = norm(ip6);
  const body = JSON.stringify({
    bearerPath,
    IFACE,
    METRIC_V4,
    METRIC_V6,
    v4,
    v6,
  });
  return crypto.createHash("sha256").update(body).digest("hex");
}

let lastAppliedHash = null;

async function applyIp(ip4, ip6) {
  const v4 = norm(ip4);
  const v6 = norm(ip6);

  const mtu = v4.mtu || v6.mtu;
  const dns = [...dnsArgs(v4.dns), ...dnsArgs(v6.dns)];

  await sh("ip", ["link", "set", IFACE, "up"]);
  await sh("ip", ["addr", "flush", "dev", IFACE]).catch(() => {});
  await sh("ip", ["-6", "addr", "flush", "dev", IFACE]).catch(() => {});
  await sh("ip", ["route", "flush", "dev", IFACE]).catch(() => {});
  await sh("ip", ["-6", "route", "flush", "dev", IFACE]).catch(() => {});

  if (mtu) await sh("ip", ["link", "set", "dev", IFACE, "mtu", String(mtu)]).catch(() => {});

  const v4static = (v4.method === "static" || v4.method === 2) && v4.addr && v4.prefix;
  const v6static = (v6.method === "static" || v6.method === 2) && v6.addr && v6.prefix;

  if (v4static) await sh("ip", ["addr", "add", `${v4.addr}/${v4.prefix}`, "dev", IFACE]).catch(() => {});
  if (v6static) await sh("ip", ["-6", "addr", "add", `${v6.addr}/${v6.prefix}`, "dev", IFACE]).catch(() => {});

  if (v4.gw) await sh("ip", ["route", "replace", "default", "via", String(v4.gw), "dev", IFACE, "metric", String(METRIC_V4)]).catch(() => {});
  if (v6.gw) await sh("ip", ["-6", "route", "replace", "default", "via", String(v6.gw), "dev", IFACE, "metric", String(METRIC_V6)]).catch(() => {});

  if (dns.length > 0) {
    await sh("resolvectl", ["dns", IFACE, ...dns]).catch(() => {});
    await sh("resolvectl", ["domain", IFACE, "~."]).catch(() => {});
  }
}

async function tryBringUp(bus) {
  log("info", "tryBringUp.begin", { APN, IPTYPE, IFACE, PRIMARY_PORT });

  const rootObj = await step("getRootProxy", () => bus.getProxyObject(BUS_NAME, ROOT));
  const om = rootObj.getInterface("org.freedesktop.DBus.ObjectManager");

  const managed = await step("GetManagedObjects", async () => du(await om.GetManagedObjects()));
  const modemPaths = Object.keys(managed).filter((p) => managed[p]["org.freedesktop.ModemManager1.Modem"]);
  log("info", "modems.found", { count: modemPaths.length, modemPaths });

  for (const mp of modemPaths) {
    const ok = await step("modemMatches", () => modemMatches(bus, mp), { modemPath: mp }).catch((e) => {
      log("warn", "modemMatches.error", { modemPath: mp, ...errInfo(e) });
      return false;
    });
    if (!ok) {
      log("debug", "modem.skip.notMatch", { modemPath: mp });
      continue;
    }

    const bearerPath = await step("simpleConnect", () => modemEnableAndConnect(bus, mp), { modemPath: mp }).catch((e) => {
      log("error", "simpleConnect.error", { modemPath: mp, ...errInfo(e) });
      return null;
    });
    if (!bearerPath) continue;

    const b = await step("bearerRead", () => bearerRead(bus, bearerPath), { bearerPath }).catch((e) => {
      log("error", "bearerRead.error", { bearerPath, ...errInfo(e) });
      return null;
    });
    if (!b) continue;

    log("info", "bearer.status", { bearerPath, connected: b.connected, iface: b.iface });

    if (!b.connected) continue;
    if (b.iface && b.iface !== IFACE) {
      log("warn", "bearer.ifaceMismatch", { bearerPath, got: b.iface, want: IFACE });
      continue;
    }

    const v4 = norm(b.ip4);
    const v6 = norm(b.ip6);
    log("info", "bearer.ip", { bearerPath, v4, v6 });

    const has4 = (v4.method === "static" || v4.method === 2) && v4.addr && v4.prefix && v4.gw;
    const has6 = (v6.method === "static" || v6.method === 2) && v6.addr && v6.prefix && v6.gw;

    if (!has4 && !has6) {
      log("warn", "bearer.noIpYet", { bearerPath });
      continue;
    }

    const h = hashConfig(bearerPath, b.ip4, b.ip6);
    if (lastAppliedHash === h) {
      log("info", "applyIp.skip.unchanged", { bearerPath });
      log("info", "tryBringUp.done", { bearerPath });
      return;
    }

    await step("applyIp", () => applyIp(b.ip4, b.ip6), { bearerPath });
    lastAppliedHash = h;
    log("info", "tryBringUp.done", { bearerPath });
    return;
  }

  log("info", "tryBringUp.noop", { reason: "noMatchingConnectedBearerWithIp" });
}

async function subscribeProps(bus, path) {
  const obj = await bus.getProxyObject(BUS_NAME, path);
  const props = obj.getInterface("org.freedesktop.DBus.Properties");
  props.on("PropertiesChanged", async (iface, changed) => {
    if (iface !== "org.freedesktop.ModemManager1.Modem" && iface !== "org.freedesktop.ModemManager1.Bearer") return;
    const keys = Object.keys(changed || {});
    if (keys.includes("Connected") || keys.includes("Ip4Config") || keys.includes("Ip6Config") || keys.includes("Interface") || keys.includes("State")) {
      log("debug", "dbus.PropertiesChanged.trigger", { path, iface, keys });
      await tryBringUp(bus).catch((e) => log("error", "tryBringUp.error", errInfo(e)));
    }
  });
}

const bus = dbus.systemBus();

const rootObj = await bus.getProxyObject(BUS_NAME, ROOT);
const om = rootObj.getInterface("org.freedesktop.DBus.ObjectManager");

await tryBringUp(bus).catch((e) => log("error", "tryBringUp.error", errInfo(e)));

const managed0 = du(await om.GetManagedObjects());
for (const path of Object.keys(managed0)) {
  if (managed0[path]["org.freedesktop.ModemManager1.Modem"] || managed0[path]["org.freedesktop.ModemManager1.Bearer"]) {
    await subscribeProps(bus, path).catch((e) => log("warn", "subscribeProps.error", { path, ...errInfo(e) }));
  }
}

om.on("InterfacesAdded", async (path, ifaces) => {
  const has = !!(ifaces["org.freedesktop.ModemManager1.Modem"] || ifaces["org.freedesktop.ModemManager1.Bearer"]);
  log("debug", "dbus.InterfacesAdded", { path, has });
  if (has) await subscribeProps(bus, path).catch((e) => log("warn", "subscribeProps.error", { path, ...errInfo(e) }));
  await tryBringUp(bus).catch((e) => log("error", "tryBringUp.error", errInfo(e)));
});

om.on("InterfacesRemoved", async (path, ifaces) => {
  log("debug", "dbus.InterfacesRemoved", { path, ifaces: Object.keys(ifaces || {}) });
  await tryBringUp(bus).catch((e) => log("error", "tryBringUp.error", errInfo(e)));
});

if (Number.isFinite(POLL_MS) && POLL_MS > 0) {
  setInterval(() => {
    tryBringUp(bus).catch((e) => log("error", "tryBringUp.error", errInfo(e)));
  }, POLL_MS);
}
```
```/etc/systemd/system/wwan-mm-watch.service
[Unit]
Description=WWAN bring-up watcher (ModemManager DBus)
Wants=ModemManager.service
After=ModemManager.service
StartLimitIntervalSec=0

[Service]
Type=simple
Environment=APN=rakuten.jp
Environment=IPTYPE=ipv4v6
Environment=IFACE=wwan0
Environment=PRIMARY_PORT=cdc-wdm0
Environment=METRIC_V4=300
Environment=METRIC_V6=300

ExecStartPre=/usr/bin/command:bash -lc 'for i in {1..120}; do test -e /dev/cdc-wdm0 && test -e /sys/class/net/wwan0 && exit 0; sleep 1; done; exit 1'
ExecStart=/usr/bin/node /opt/wwan-mm/wwan-mm-watch.mjs

Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

上記のスクリプト・サービスを動かすと、筆者の環境では`ip`コマンドで以下の出力を得られました。

```command:bash
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host noprefixroute 
       valid_lft forever preferred_lft forever
2: wwan0: <BROADCAST,MULTICAST,NOARP,UP,LOWER_UP> mtu 1440 qdisc fq_codel state UNKNOWN group default qlen 1000
    link/ether ee:7e:33:cb:d0:c0 brd ff:ff:ff:ff:ff:ff
    altname wwp100s0f4u1u2i4
    inet 10.104.163.79/27 scope global wwan0
       valid_lft forever preferred_lft forever
3: wlp1s0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether c8:8a:9a:c3:61:f8 brd ff:ff:ff:ff:ff:ff
    altname wlxc88a9ac361f8
    inet 10.51.244.212/20 metric 200 brd 10.51.255.255 scope global dynamic wlp1s0
       valid_lft 604324sec preferred_lft 604324sec
    inet6 fe80::ca8a:9aff:fec3:61f8/64 scope link proto kernel_ll 
       valid_lft forever preferred_lft forever
```

`ping`コマンドでインターフェイスを指定して疎通確認をする

```command:bash
ping -I wwan0 8.8.8.8
```

# 通話とメッセージ

あとで書く　下記以外の問題は全てが正常に動作します

# 既知の問題

通話にて、発信と受信・応答には成功しますが、音声が聞こえない問題があります。おそらくクライアントの問題であるので、gnome-calls以外のクライアントを探しています。

# おわりに

俺が最強　天上天下唯我独尊

---

[^1]: `cmake .. -DUSE_SYSTEM_DEPS=ON -DLPAC_WITH_APDU_QMI=ON -DLPAC_WITH_APDU_AT=ON`でビルドし、`LPAC_AT_DEBUG=1 LPAC_APDU=at LPAC_APDU_DEVICE=/dev/ttyUSB3 lpac ...`で成功した。試験的なものであるため、実行時に警告が出る。
[^2]: 本当によくわかっていない。助けてほしい。
[^3]: `2`については不明。
