# -*- coding: utf-8 -*-
"""
프리미엄 히어로 영상 엔진 v2 — 무드팩 기반 (인물 미등장 웰니스 무드)
════════════════════════════════════════════════════════════════════
· 입력  : moods/<무드명>/mood.json + src/*.jpg   ← 무드만 바꾸면 재생성 끝
· 출력  : assets/media/hero-desktop.mp4 (1920×1080)
          assets/media/hero-mobile.mp4  (1080×1920)
          assets/media/hero-poster.jpg / hero-poster-m.jpg
· 효과  : 랭코즈 프리스케일 → 줌팬(in/out/drift) → 크로스페이드 체인
          → 블룸(glow) → 웜 그레이딩 → 비네트 → 필름 그레인 → 언샵
· 루프  : 첫 샷과 마지막 샷을 같은 소스로 bookend 하고 줌 방향을 반전해
          끝 프레임이 시작 프레임(줌 1.0)에 수렴 — 끊김 없는 무한 루프
· 사용  : python _build/hero/make_hero.py --mood calm-morning
          python _build/hero/make_hero.py --mood calm-morning --only desktop
· 요구  : ffmpeg (PATH)

◆ 자동화 가이드 (z.ai / codex 산출물 교체)
  새 클라이언트 = 무드 폴더 하나 복사 → src 이미지를 같은 번호 파일명으로
  덮어쓰고(01-curtain.jpg … 06-curtain-b.jpg) mood.json 샷 구성만 손본다.
  엔진(make_hero.py)은 건드리지 않는다. 이미지 생성 프롬프트 예시:
  "soft morning light through sheer linen curtains, empty bright pilates
   studio, beige and sage tones, no people, cinematic still, 4k"
  ※ 첫(01)·끝(06) 샷은 같은 이미지로 유지해야 루프가 봉합된다.
"""
import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]        # premium-template/
MEDIA = ROOT / "assets" / "media"
FF = "ffmpeg"


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-1500:])
        sys.exit(1)


def md5(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()[:10]


def motion_expr(kind: str, rate: float, frames: int):
    """줌팬 표현식 — in: 줌인 / out: 줌아웃(1.0 수렴) / drift: 고정줌 + 사인 팬"""
    center_x = "iw/2-(iw/zoom/2)"
    center_y = "ih/2-(ih/zoom/2)"
    if kind == "in":
        return f"1+{rate}*on", center_x, center_y
    if kind == "out":
        z_max = 1 + rate * frames
        return f"max({z_max:.4f}-{rate}*on,1)", center_x, center_y
    # drift — 고정 줌에서 좌우로 느리게 흐른다
    return "1.06", f"{center_x}+iw*0.012*sin(on/{frames}*PI)", center_y


def aspect_crop(src: Path, ratio_w: int, ratio_h: int, focus_x: float, rect=None) -> str:
    """소스를 목표 비율로 focus_x 기준 크롭 (세로는 중앙).
    rect=[x,y,w,h] 가 지정되면 단일 고해상 원본의 '같은 공간 다른 앵글' 크롭으로
    사용한다 — 단일 세계관 히어로(끊어짐 없는 하나의 공간 탐색)의 핵심."""
    if rect:
        x, y, w, h = rect
        if w / h > ratio_w / ratio_h:              # 크롭이 더 넓으면 좌우 축소
            cw, ch = round(h * ratio_w / ratio_h / 2) * 2, h
            cx, cy = int(x + (w - cw) * focus_x), y + int((h - ch) / 2)
        else:                                      # 크롭이 더 높으면 상하 축소
            cw, ch = w, round(w * ratio_h / ratio_w / 2) * 2
            cx, cy = x, y + int((h - ch) / 2)
        return f"crop={cw}:{ch}:{cx}:{cy}"
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height", "-of", "csv=p=0", str(src)],
        capture_output=True, text=True)
    w, h = map(int, r.stdout.strip().split(","))
    if w / h > ratio_w / ratio_h:                 # 소스가 더 넓으면 좌우 크롭
        cw, ch = round(h * ratio_w / ratio_h / 2) * 2, h
    else:                                         # 소스가 더 높으면 상하 크롭
        cw, ch = w, round(w * ratio_h / ratio_w / 2) * 2
    cx = int((w - cw) * focus_x)
    cy = int((h - ch) / 2)
    return f"crop={cw}:{ch}:{cx}:{cy}"


def build_shot(out: Path, src: Path, kind, rate, fps, frames,
               out_size, prescale, focus_x, bright=0.0, rect=None) -> Path:
    ratio_w, ratio_h = (int(v) for v in out_size.split("x"))
    crop = aspect_crop(src, ratio_w, ratio_h, focus_x, rect)
    z, x, y = motion_expr(kind, rate, frames)
    # 샷별 밝기 보정 — 어두운 원본을 개별 들어올린다 (mood.json shots[].bright)
    pre = f"eq=brightness={bright}," if bright else ""
    vf = (
        f"{crop},scale={prescale}:-2:flags=lanczos,format=yuv420p,{pre}"
        f"zoompan=z='{z}':x='{x}':y='{y}':d={frames}:s={out_size}:fps={fps}"
    )
    run([FF, "-y", "-loop", "1", "-framerate", str(fps), "-i", str(src),
         "-vf", vf, "-frames:v", str(frames),
         "-c:v", "libx264", "-preset", "fast", "-crf", "18",
         "-pix_fmt", "yuv420p", str(out)])
    return out


def post_chain(g: dict) -> str:
    """최종 시네마틱 체인 — 블룸 → 그레이딩 → 비네트 → 그레인 → 언샵"""
    return (
        f"split[va][vb];"
        f"[va]gblur=sigma={g['bloom_sigma']}[vglow];"
        f"[vb][vglow]blend=all_mode=screen:all_opacity={g['bloom']}[vbloom];"
        f"[vbloom]eq=saturation={g['saturation']}:brightness={g['brightness']}"
        f":contrast={g['contrast']},"
        f"colorbalance=rs={g['warmth_rs']}:bs={g['warmth_bs']},"
        f"vignette=angle={g['vignette_angle']},"
        f"noise=alls={g['grain']}:allf=t+u,"
        f"unsharp=5:5:{g['sharpen']},format=yuv420p[vout]"
    )


def build_target(name, cfg, shots, m, tmp: Path) -> Path:
    fps = m["motion"]["fps"]
    sec = m["motion"]["shot_seconds"]
    fade = m["motion"]["fade"]
    rate = m["motion"]["zoom_rate"]
    frames = round(fps * sec)

    clips = [
        build_shot(tmp / f"{name}-{i:02d}.mp4", Path(s["_dir"]) / s["src"],
                   s["motion"], rate, fps, frames,
                   f"{cfg['width']}x{cfg['height']}", cfg["prescale"],
                   float(s.get("focus_x", 0.5)), float(s.get("bright", 0)),
                   s.get("rect"))
        for i, s in enumerate(shots)
    ]

    ins = []
    for c in clips:
        ins += ["-i", str(c)]

    # 크로스페이드 체인 → 마지막 노드를 후처리 체인에 연결
    # transition: "fade" 일반 크로스페이드 / "fadewhite" 빛으로 스치듯 지나가는
    #             라이트 디졸브 — 단일 세계관 루프에서 컷 느낌을 지운다 (v2.1)
    trans = m["motion"].get("transition", "fade")
    fc, prev = [], "[0:v]"
    for i in range(1, len(clips)):
        off = i * (sec - fade)
        fc.append(f"{prev}[{i}:v]xfade=transition={trans}:duration={fade}"
                  f":offset={off:.2f}[vx{i}]")
        prev = f"[vx{i}]"
    full = ";".join(fc) + (";" if fc else "") + f"{prev}{post_chain(m['grade'])}"

    out = MEDIA / f"hero-{name}.mp4"
    run([FF, "-y", *ins, "-filter_complex", full, "-map", "[vout]",
         "-c:v", "libx264", "-preset", "slow", "-crf", str(cfg["crf"]),
         "-movflags", "+faststart", "-an", str(out)])
    return out


def make_poster(video: Path, poster: Path):
    run([FF, "-y", "-ss", "0.8", "-i", str(video), "-frames:v", "1",
         "-q:v", "3", str(poster)])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mood", default="calm-morning", help="moods/ 아래 무드 폴더명")
    ap.add_argument("--only", choices=["desktop", "mobile"], help="한쪽만 생성")
    args = ap.parse_args()

    mood_dir = Path(__file__).resolve().parent / "moods" / args.mood
    m = json.loads((mood_dir / "mood.json").read_text(encoding="utf-8"))
    for s in m["shots"]:
        s["_dir"] = str(mood_dir / "src")

    MEDIA.mkdir(parents=True, exist_ok=True)
    tmp = mood_dir / ".tmp"
    tmp.mkdir(exist_ok=True)

    targets = ["desktop", "mobile"] if not args.only else [args.only]
    for name in targets:
        out = build_target(name, m["outputs"][name], m["shots"], m, tmp)
        poster = MEDIA / ("hero-poster.jpg" if name == "desktop" else "hero-poster-m.jpg")
        make_poster(out, poster)
        print(f"OK {out.name}: {out.stat().st_size / 1e6:.1f} MB  md5:{md5(out)}")

    # 데스크톱/모바일 해시가 같으면 생성 구성 오류 (동일 파일 중복 방지)
    hashes = [md5(MEDIA / f"hero-{n}.mp4") for n in targets]
    if len(set(hashes)) != len(hashes):
        print("경고: 데스크톱/모바일 해시가 동일합니다 — 생성 구성 확인 필요")
        sys.exit(1)

    for f in tmp.glob("*.mp4"):
        f.unlink()


if __name__ == "__main__":
    main()
