import sys
import time
import threading
from datetime import datetime

# Fix Windows console encoding for Unicode characters
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


# ── ANSI COLOR CODES ──────────────────────────────────
class C:
    RESET   = '\033[0m'
    BOLD    = '\033[1m'
    DIM     = '\033[2m'

    BLACK   = '\033[30m'
    RED     = '\033[38;5;203m'
    GREEN   = '\033[38;5;120m'
    YELLOW  = '\033[38;5;227m'
    BLUE    = '\033[38;5;75m'
    MAGENTA = '\033[38;5;213m'
    CYAN    = '\033[38;5;86m'
    WHITE   = '\033[97m'
    ORANGE  = '\033[38;5;215m'
    MUTED   = '\033[38;5;241m'

    BG_DARK  = '\033[48;5;234m'
    BG_GREEN = '\033[48;5;22m'
    BG_RED   = '\033[48;5;52m'


def now():
    return datetime.utcnow().strftime('%H:%M:%S')


def ist():
    from datetime import timezone, timedelta
    return datetime.now(timezone(timedelta(hours=5,
           minutes=30))).strftime('%H:%M:%S')


# ── BANNER ────────────────────────────────────────────
def banner(title: str, subtitle: str = ""):
    w = 62
    line = '═' * w
    print()
    print(f"{C.CYAN}{C.BOLD}╔{line}╗{C.RESET}")
    pad = (w - len(title)) // 2
    print(f"{C.CYAN}{C.BOLD}║{' '*pad}{C.WHITE}{title}"
          f"{' '*(w - pad - len(title))}║{C.RESET}")
    if subtitle:
        pad2 = (w - len(subtitle)) // 2
        print(f"{C.CYAN}║{' '*pad2}{C.MUTED}{subtitle}"
              f"{' '*(w - pad2 - len(subtitle))}║{C.RESET}")
    print(f"{C.CYAN}{C.BOLD}╚{line}╝{C.RESET}")
    print()


# ── SECTION HEADER ────────────────────────────────────
def section(title: str):
    print()
    print(f"  {C.CYAN}┌─{C.RESET} {C.BOLD}{C.WHITE}{title}"
          f"{C.RESET} {C.CYAN}{'─'*(54-len(title))}┐{C.RESET}")


def section_end():
    print(f"  {C.CYAN}└{'─'*58}┘{C.RESET}")


# ── LOG LEVELS ────────────────────────────────────────
def info(module: str, msg: str, value: str = ""):
    tag = f"{C.BG_DARK}{C.BLUE} {module:<12} {C.RESET}"
    val = f" {C.CYAN}{value}{C.RESET}" if value else ""
    print(f"  {C.MUTED}{ist()}{C.RESET}  {tag}  "
          f"{C.WHITE}{msg}{C.RESET}{val}")


def success(module: str, msg: str, value: str = ""):
    tag = f"{C.BG_GREEN}{C.GREEN} ✓ {module:<10} {C.RESET}"
    val = f" {C.GREEN}{C.BOLD}{value}{C.RESET}" if value else ""
    print(f"  {C.MUTED}{ist()}{C.RESET}  {tag}  "
          f"{C.WHITE}{msg}{C.RESET}{val}")


def warn(module: str, msg: str, value: str = ""):
    tag = f"{C.YELLOW}▲ {module:<12}{C.RESET}"
    val = f" {C.YELLOW}{value}{C.RESET}" if value else ""
    print(f"  {C.MUTED}{ist()}{C.RESET}  {tag}  "
          f"{C.YELLOW}{msg}{C.RESET}{val}")


def error(module: str, msg: str, value: str = ""):
    tag = f"{C.BG_RED}{C.RED} ✗ {module:<10} {C.RESET}"
    val = f" {C.RED}{value}{C.RESET}" if value else ""
    print(f"  {C.MUTED}{ist()}{C.RESET}  {tag}  "
          f"{C.RED}{msg}{C.RESET}{val}")


def critical(module: str, msg: str, value: str = ""):
    tag = f"{C.RED}{C.BOLD}⚠ CRITICAL  {C.RESET}"
    print(f"\n  {C.RED}{'─'*58}{C.RESET}")
    print(f"  {ist()}  {tag} "
          f"{C.RED}{C.BOLD}{module} — {msg}{C.RESET} "
          f"{C.YELLOW}{value}{C.RESET}")
    print(f"  {C.RED}{'─'*58}{C.RESET}\n")


# ── PROCESSED RECORD ──────────────────────────────────
def processed(city: str, pollutant: str, co2e: float,
              score: int, source: str):
    # Score color
    if score >= 75:
        sc = f"{C.GREEN}{score:>3}/100{C.RESET}"
        bar_c = C.GREEN
    elif score >= 50:
        sc = f"{C.YELLOW}{score:>3}/100{C.RESET}"
        bar_c = C.YELLOW
    elif score >= 25:
        sc = f"{C.ORANGE}{score:>3}/100{C.RESET}"
        bar_c = C.ORANGE
    else:
        sc = f"{C.RED}{score:>3}/100{C.RESET}"
        bar_c = C.RED

    # Mini compliance bar (10 chars)
    filled = score // 10
    bar = (f"{bar_c}{'█' * filled}"
           f"{C.MUTED}{'░' * (10 - filled)}{C.RESET}")

    # CO2e color
    if co2e > 5000:
        co2_str = f"{C.RED}{co2e:>8.1f}{C.RESET}"
    elif co2e > 1000:
        co2_str = f"{C.YELLOW}{co2e:>8.1f}{C.RESET}"
    else:
        co2_str = f"{C.GREEN}{co2e:>8.1f}{C.RESET}"

    src_short = source[:10] if source else "unknown"

    print(f"  {C.MUTED}{ist()}{C.RESET}  "
          f"{C.CYAN}{'●'}{C.RESET}  "
          f"{C.WHITE}{city:<18}{C.RESET}  "
          f"{C.BLUE}{pollutant:<12}{C.RESET}  "
          f"CO₂e {co2_str} µg/m³  "
          f"{bar}  {sc}  "
          f"{C.MUTED}{src_short}{C.RESET}")


# ── ML TRAINING ───────────────────────────────────────
def ml_epoch(model: str, city: str, pollutant: str,
             epoch: int, total: int, loss: float):
    pct = epoch / total
    bar_len = 20
    filled = int(pct * bar_len)
    bar = (f"{C.GREEN}{'━' * filled}"
           f"{C.MUTED}{'╌' * (bar_len - filled)}{C.RESET}")
    print(f"  {C.MUTED}{ist()}{C.RESET}  "
          f"{C.MAGENTA}[{model}]{C.RESET}  "
          f"{city} {C.MUTED}|{C.RESET} {pollutant}  "
          f"{bar}  "
          f"{C.MUTED}ep {epoch:>3}/{total}{C.RESET}  "
          f"loss {C.YELLOW}{loss:.6f}{C.RESET}",
          end='\r')
    if epoch == total - 1:
        print()  # newline on last epoch


def ml_result(model: str, city: str, pollutant: str,
              accuracy: float, mape: float, points: int):
    if accuracy >= 85:
        acc_str = f"{C.GREEN}{C.BOLD}{accuracy:.1f}%{C.RESET}"
        status = f"{C.GREEN}✓ TARGET MET{C.RESET}"
    elif accuracy >= 70:
        acc_str = f"{C.YELLOW}{accuracy:.1f}%{C.RESET}"
        status = f"{C.YELLOW}~ ACCEPTABLE{C.RESET}"
    else:
        acc_str = f"{C.RED}{accuracy:.1f}%{C.RESET}"
        status = f"{C.RED}✗ NEEDS DATA{C.RESET}"

    print(f"\n  {C.CYAN}┌── ML Result {'─'*44}┐{C.RESET}")
    print(f"  {C.CYAN}│{C.RESET}  Model      {C.MAGENTA}{model:<42}{C.RESET}{C.CYAN}│{C.RESET}")
    print(f"  {C.CYAN}│{C.RESET}  City       {C.WHITE}{city:<42}{C.RESET}{C.CYAN}│{C.RESET}")
    print(f"  {C.CYAN}│{C.RESET}  Pollutant  {C.BLUE}{pollutant:<42}{C.RESET}{C.CYAN}│{C.RESET}")
    print(f"  {C.CYAN}│{C.RESET}  Accuracy   {acc_str:<50}  {C.CYAN}│{C.RESET}")
    print(f"  {C.CYAN}│{C.RESET}  MAPE       {C.YELLOW}{mape:.1f}%{C.RESET:<46}  {C.CYAN}│{C.RESET}")
    print(f"  {C.CYAN}│{C.RESET}  Data pts   {C.WHITE}{points:<42}{C.RESET}{C.CYAN}│{C.RESET}")
    print(f"  {C.CYAN}│{C.RESET}  Status     {status:<50}  {C.CYAN}│{C.RESET}")
    print(f"  {C.CYAN}└{'─'*58}┘{C.RESET}\n")


# ── ANOMALY ALERT ─────────────────────────────────────
def anomaly(city: str, pollutant: str,
            severity: str, score: float, value: float):
    icons = {'HIGH': '⚠', 'MEDIUM': '▲', 'LOW': '●'}
    colors = {
        'HIGH': C.RED,
        'MEDIUM': C.YELLOW,
        'LOW': C.CYAN,
    }
    col = colors.get(severity, C.WHITE)
    icon = icons.get(severity, '●')
    print(f"  {C.MUTED}{ist()}{C.RESET}  "
          f"{col}{C.BOLD}{icon} ANOMALY [{severity}]{C.RESET}  "
          f"{C.WHITE}{city:<16}{C.RESET}  "
          f"{C.BLUE}{pollutant:<10}{C.RESET}  "
          f"val={C.YELLOW}{value:.2f}{C.RESET}  "
          f"score={C.RED}{score:.3f}{C.RESET}")


# ── KAFKA EVENT ───────────────────────────────────────
def kafka_sent(topic: str, city: str,
               pollutant: str, value: float):
    topic_colors = {
        'emissions.industrial': C.ORANGE,
        'emissions.transport':  C.BLUE,
        'emissions.energy':     C.YELLOW,
        'emissions.historical': C.MUTED,
    }
    col = topic_colors.get(topic, C.WHITE)
    short = topic.replace('emissions.', '')
    print(f"  {C.MUTED}{ist()}{C.RESET}  "
          f"{col}↑ KAFKA [{short:<10}]{C.RESET}  "
          f"{C.WHITE}{city:<16}{C.RESET}  "
          f"{C.BLUE}{pollutant:<12}{C.RESET}  "
          f"{C.GREEN}{value:.4f}{C.RESET}")


# ── SOURCE STATUS TABLE ───────────────────────────────
def print_sources_table(sources: list):
    """
    sources = list of dicts:
    { name, records, status, interval, sector }
    status: 'ok' | 'warn' | 'error'
    """
    print()
    print(f"  {C.CYAN}┌{'─'*60}┐{C.RESET}")
    print(f"  {C.CYAN}│{C.RESET}  "
          f"{C.BOLD}{C.WHITE}{'SOURCE':<22} {'RECORDS':>8}"
          f"  {'STATUS':<8}  {'SECTOR':<14}  {'INTERVAL'}"
          f"{C.RESET}"
          f"  {C.CYAN}│{C.RESET}")
    print(f"  {C.CYAN}├{'─'*60}┤{C.RESET}")
    for s in sources:
        st = s.get('status', 'ok')
        sc = C.GREEN if st == 'ok' else (
             C.YELLOW if st == 'warn' else C.RED)
        icon = '✓' if st == 'ok' else (
               '▲' if st == 'warn' else '✗')
        print(f"  {C.CYAN}│{C.RESET}  "
              f"{C.WHITE}{s['name']:<22}{C.RESET}"
              f"{C.GREEN}{s['records']:>8}{C.RESET}  "
              f"{sc}{icon} {st:<6}{C.RESET}  "
              f"{C.BLUE}{s['sector']:<14}{C.RESET}  "
              f"{C.MUTED}{s['interval']}{C.RESET}"
              f"  {C.CYAN}│{C.RESET}")
    print(f"  {C.CYAN}└{'─'*60}┘{C.RESET}")
    print()


# ── TRAINING SUMMARY ──────────────────────────────────
def training_summary(xgb_acc: float, lstm_count: int,
                     prophet_count: int, anomaly_count: int,
                     high_risk: list):
    print()
    w = 58
    print(f"  {C.GREEN}{C.BOLD}╔{'═'*w}╗{C.RESET}")
    title = "VayuDrishti ML Training Complete"
    pad = (w - len(title)) // 2
    print(f"  {C.GREEN}{C.BOLD}║"
          f"{' '*pad}{C.WHITE}{title}"
          f"{' '*(w-pad-len(title))}"
          f"{C.GREEN}║{C.RESET}")
    print(f"  {C.GREEN}╠{'═'*w}╣{C.RESET}")

    def row(label, value, color=C.GREEN):
        pad_r = w - 4 - len(label) - len(str(value))
        print(f"  {C.GREEN}║{C.RESET}  "
              f"{C.MUTED}{label}{C.RESET}  "
              f"{color}{C.BOLD}{value}{C.RESET}"
              f"{' '*max(0,pad_r)}"
              f"  {C.GREEN}║{C.RESET}")

    row("XGBoost CO₂e Accuracy  :",
        f"{xgb_acc:.1f}%  ✓ TARGET MET", C.GREEN)
    row("LSTM Models Trained    :", str(lstm_count), C.CYAN)
    row("Prophet Models Trained :", str(prophet_count), C.CYAN)
    row("Anomalies Detected     :", str(anomaly_count), C.YELLOW)
    row("High Risk Cities       :",
        ', '.join(high_risk) if high_risk else 'None',
        C.RED if high_risk else C.MUTED)

    print(f"  {C.GREEN}╚{'═'*w}╝{C.RESET}")
    print()


# ── STARTUP BANNER ────────────────────────────────────
def startup_banner():
    print()
    lines = [
        f"{C.CYAN}{'═'*64}{C.RESET}",
        f"",
        f"  {C.GREEN}{C.BOLD}██╗   ██╗ █████╗ ██╗   ██╗██╗   ██╗{C.RESET}",
        f"  {C.GREEN}{C.BOLD}██║   ██║██╔══██╗╚██╗ ██╔╝██║   ██║{C.RESET}",
        f"  {C.GREEN}{C.BOLD}██║   ██║███████║ ╚████╔╝ ██║   ██║{C.RESET}",
        f"  {C.CYAN}{C.BOLD}╚██╗ ██╔╝██╔══██║  ╚██╔╝  ██║   ██║{C.RESET}",
        f"  {C.CYAN}{C.BOLD} ╚████╔╝ ██║  ██║   ██║   ╚██████╔╝{C.RESET}",
        f"  {C.CYAN}{C.BOLD}  ╚═══╝  ╚═╝  ╚═╝   ╚═╝    ╚═════╝ {C.RESET}",
        f"",
        f"  {C.MUTED}DRISHTI  ·  Carbon Intelligence Platform{C.RESET}",
        f"  {C.MUTED}SDG 13   ·  Endor Environmental Alliance{C.RESET}",
        f"  {C.MUTED}India    ·  28 States + UTs Coverage{C.RESET}",
        f"",
        f"{C.CYAN}{'═'*64}{C.RESET}",
    ]
    for l in lines:
        print(l)
    print()
