#!/usr/bin/env python3
"""扫描 img/ 目录，生成 js/photos-index.js（杯款 id → 社区贡献的实拍图）。

用法：
    python3 tools/build_photos.py            # 生成索引
    python3 tools/build_photos.py --check    # 只校验，不写文件（CI 用）

规则见 CONTRIBUTING-PHOTOS.md：文件名必须是 data.js 里存在的杯款 id，
可加 -2 / -3 后缀表示同一杯款的其他角度。署名读自 img/CREDITS.tsv。
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "img")
DATA = os.path.join(ROOT, "js", "data.js")
OUT = os.path.join(ROOT, "js", "photos-index.js")
CREDITS = os.path.join(IMG, "CREDITS.tsv")

EXT = (".jpg", ".jpeg", ".png", ".webp")
MAX_BYTES = 400_000          # 单张上限，超了要求先压缩


def load_ids():
    txt = open(DATA, encoding="utf-8").read()
    mugs = json.loads(txt[txt.index("["):txt.rindex("]") + 1])
    return {m["id"] for m in mugs}


def load_credits():
    out = {}
    if not os.path.exists(CREDITS):
        return out
    for line in open(CREDITS, encoding="utf-8"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("\t")
        if len(parts) >= 2:
            out[parts[0]] = {"by": parts[1], "license": parts[2] if len(parts) > 2 else "CC BY 4.0"}
    return out


def main():
    check_only = "--check" in sys.argv
    if not os.path.isdir(IMG):
        print(f"没有 {IMG} 目录，跳过（还没有社区照片）")
        if not check_only:
            write({}, {})
        return 0

    ids = load_ids()
    credits = load_credits()
    photos, errors = {}, []

    for name in sorted(os.listdir(IMG)):
        path = os.path.join(IMG, name)
        if not os.path.isfile(path) or name == "CREDITS.tsv":
            continue
        base, ext = os.path.splitext(name)
        if ext.lower() not in EXT:
            errors.append(f"{name}: 不支持的格式（只收 {', '.join(EXT)}）")
            continue
        mug_id = re.sub(r"-\d+$", "", base)
        if mug_id not in ids:
            errors.append(f"{name}: 文件名 '{mug_id}' 不是 data.js 里的杯款 id")
            continue
        size = os.path.getsize(path)
        if size > MAX_BYTES:
            errors.append(f"{name}: {size // 1024} KB 超过 {MAX_BYTES // 1024} KB 上限，请先压缩")
            continue
        photos.setdefault(mug_id, []).append("img/" + name)

    if errors:
        print(f"❌ {len(errors)} 个问题：")
        for e in errors:
            print("   ", e)
        return 1

    n_files = sum(len(v) for v in photos.values())
    print(f"✅ {n_files} 张照片，覆盖 {len(photos)} 款杯子")
    unc = [k for k in photos if k not in credits]
    if unc:
        print(f"   （{len(unc)} 款未在 CREDITS.tsv 登记署名，将按默认 CC BY 4.0 处理）")
    if not check_only:
        write(photos, credits)
        print(f"   已写入 {OUT}")
    return 0


def write(photos, credits):
    body = {k: {"src": v, "credit": credits.get(k)} for k, v in sorted(photos.items())}
    head = ("/* 社区贡献的实拍照片索引 —— 由 tools/build_photos.py 从 img/ 目录生成，请勿手改。\n"
            " * 每位贡献者只上传自己拍摄、自己拥有的杯子；署名见 img/CREDITS.tsv。 */\n")
    lines = ",\n".join(f"  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}"
                       for k, v in body.items())
    open(OUT, "w", encoding="utf-8").write(head + "window.PHOTO_INDEX = {\n" + lines + "\n};\n")


if __name__ == "__main__":
    sys.exit(main())
