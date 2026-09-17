"""
BRABO STUDIO — Migração pro Supabase (nuvem)
Roda esse script UMA VEZ (ou quantas vezes precisar, ele não duplica)
pra levar todo o seu histórico financeiro local pro banco de dados na
nuvem, pra aparecer no app mobile.

Como usar:
    py migrar_para_supabase.py

Vai pedir sua senha de login do Supabase. Ela NÃO fica salva em
nenhum lugar — só é usada durante essa execução, pra autenticar.
"""
import sqlite3
import os
import json
import urllib.request
import urllib.error

SUPABASE_URL = "https://gobcpgqukxmioectkxsm.supabase.co"
SUPABASE_ANON_KEY = "sb_publishable_MdWyNDtlBz8pV-BrCcRZWQ_DoHWyp3J"
EMAIL_PADRAO = "contatobraulliobarros@gmail.com"

DB_PATH = os.path.join(os.path.expanduser("~"), "BraboStudioDados", "brabo_financeiro.db")


def formatar_moeda(valor):
    return f"R$ {float(valor):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def autenticar(email, senha):
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    corpo = json.dumps({"email": email, "password": senha}).encode("utf-8")
    req = urllib.request.Request(url, data=corpo, method="POST", headers={
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req) as resposta:
        dados = json.loads(resposta.read())
    return dados["access_token"]


def assinatura(linha):
    """Uma 'impressão digital' do lançamento, pra saber se já foi importado antes."""
    return (
        linha.get("data"),
        linha.get("tipo"),
        round(float(linha.get("valor") or 0), 2),
        (linha.get("cliente") or "").strip().lower(),
        (linha.get("descricao") or "").strip().lower(),
        linha.get("categoria_despesa") or "",
    )


def buscar_assinaturas_existentes(token):
    url = f"{SUPABASE_URL}/rest/v1/transacoes?select=data,tipo,valor,cliente,descricao,categoria_despesa"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token}",
    })
    with urllib.request.urlopen(req) as resposta:
        linhas = json.loads(resposta.read())
    return {assinatura(l) for l in linhas}


def inserir_transacao(token, dados):
    url = f"{SUPABASE_URL}/rest/v1/transacoes"
    corpo = json.dumps(dados).encode("utf-8")
    req = urllib.request.Request(url, data=corpo, method="POST", headers={
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    })
    urllib.request.urlopen(req)


def main():
    print("=" * 54)
    print("  BRABO STUDIO — Migração do banco local pro Supabase")
    print("=" * 54)

    if not os.path.exists(DB_PATH):
        print(f"\nNão achei o banco de dados em:\n  {DB_PATH}")
        print("Confirma se esse é o caminho certo no seu computador.")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM transacoes ORDER BY id")
    registros = [dict(r) for r in cur.fetchall()]
    conn.close()
    print(f"\nEncontrei {len(registros)} lançamento(s) no banco local.")

    email = input(f"\nE-mail de login [{EMAIL_PADRAO}]: ").strip() or EMAIL_PADRAO
    senha = input("Senha (vai aparecer normal enquanto digita, sem problema): ").strip()

    print("\nAutenticando no Supabase...")
    try:
        token = autenticar(email, senha)
    except urllib.error.HTTPError as e:
        print("Erro ao fazer login:", e.read().decode())
        return
    print("Login OK!")

    print("Verificando o que já existe na nuvem (pra não duplicar)...")
    existentes = buscar_assinaturas_existentes(token)
    print(f"Já existem {len(existentes)} lançamento(s) na nuvem.")

    print(f"\nVou conferir os {len(registros)} lançamentos locais e importar só os que faltam.")
    confirmacao = input("Continuar? (s/n): ").strip().lower()
    if confirmacao != "s":
        print("Cancelado, nada foi enviado.")
        return

    importados = 0
    pulados = 0
    erros = 0
    for r in registros:
        campos = {
            "tipo": r["tipo"],
            "data": r["data"],
            "valor": r["valor"],
            "veiculo": r.get("veiculo"),
            "modelo": r.get("modelo"),
            "servico": r.get("servico"),
            "descricao": r.get("descricao"),
            "categoria_despesa": r.get("categoria_despesa"),
            "forma_pagamento": r.get("forma_pagamento"),
            "cliente": r.get("cliente"),
            "whatsapp": r.get("whatsapp"),
            "prazo": r.get("prazo") or None,
            "status": r["status"],
        }
        assin = assinatura(campos)
        if assin in existentes:
            pulados += 1
            continue
        try:
            inserir_transacao(token, campos)
            existentes.add(assin)
            importados += 1
            rotulo = r.get("descricao") or r.get("cliente") or r["tipo"]
            print(f"  ✓ #{r['id']} {rotulo} — {formatar_moeda(r['valor'])}")
        except urllib.error.HTTPError as e:
            erros += 1
            print(f"  ✗ #{r['id']}: erro — {e.read().decode()}")

    print("\n" + "=" * 54)
    print(f"Importados agora:        {importados}")
    print(f"Já existiam (pulados):   {pulados}")
    print(f"Erros:                   {erros}")
    print("=" * 54)
    print("\nPronto! Abre o app mobile e confere o Histórico.")


if __name__ == "__main__":
    main()
