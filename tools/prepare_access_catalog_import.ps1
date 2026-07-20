param(
  [string]$AccessPath = "",
  [string]$OutputDir = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Convert-DbValue($value) {
  if ($null -eq $value -or $value -is [DBNull]) { return $null }
  if ($value -is [datetime]) { return $value.ToString("yyyy-MM-dd") }
  return $value
}

function Read-AccessTable($connection, $tableName) {
  $cmd = $connection.CreateCommand()
  $cmd.CommandText = "select * from [$tableName]"
  $reader = $cmd.ExecuteReader()
  $rows = New-Object System.Collections.Generic.List[object]
  try {
    while ($reader.Read()) {
      $row = [ordered]@{}
      for ($i = 0; $i -lt $reader.FieldCount; $i++) {
        $row[$reader.GetName($i)] = Convert-DbValue $reader.GetValue($i)
      }
      $rows.Add([pscustomobject]$row)
    }
  } finally {
    $reader.Close()
  }
  return $rows.ToArray()
}

function SqlString($value) {
  if ($null -eq $value) { return "null" }
  $text = ([string]$value).Trim()
  if ($text -eq "") { return "null" }
  return "'" + $text.Replace("'", "''") + "'"
}

function SqlText($value) {
  if ($null -eq $value) { return "''" }
  $text = ([string]$value).Trim()
  return "'" + $text.Replace("'", "''") + "'"
}

function SqlRequiredString($value, $fallback) {
  $text = if ($null -eq $value) { "" } else { ([string]$value).Trim() }
  if ($text -eq "") { $text = $fallback }
  return SqlString $text
}

function SqlNumber($value) {
  if ($null -eq $value) { return "null" }
  $text = ([string]$value).Trim()
  if ($text -eq "") { return "null" }
  $normalized = $text -replace '[R$\s]', ''
  if ($normalized -match ',' -and $normalized -match '\.') {
    $normalized = $normalized -replace '\.', ''
    $normalized = $normalized -replace ',', '.'
  } else {
    $normalized = $normalized -replace ',', '.'
  }
  if ($normalized -notmatch '^-?\d+(\.\d+)?$') { return "null" }
  return $normalized
}

function SqlDate($value) {
  if ($null -eq $value) { return "null" }
  $text = ([string]$value).Trim()
  if ($text -eq "") { return "null" }
  return SqlString $text.Substring(0, [Math]::Min(10, $text.Length))
}

function Normalize-Cnpj($value) {
  $text = if ($null -eq $value) { "" } else { ([string]$value).Trim() }
  if ($text -eq "") { return "" }
  return ($text -replace '\D', '')
}

function Normalize-StatusContrato($value) {
  $text = if ($null -eq $value) { "" } else { ([string]$value).Trim().ToLowerInvariant() }
  if ($text -match 'encerr|finaliz|conclu') { return "encerrado" }
  if ($text -match 'susp|cancel') { return "suspenso" }
  return "ativo"
}

function Normalize-StatusUnidade($value) {
  $text = if ($null -eq $value) { "" } else { ([string]$value).Trim().ToLowerInvariant() }
  if ($text -match 'retir|desinstal|inativ|baix') { return "retirada" }
  if ($text -match 'manut|pend') { return "manutencao" }
  return "instalada"
}

function Split-Location($value) {
  $text = if ($null -eq $value) { "" } else { ([string]$value).Trim() }
  $result = [ordered]@{ estado = ""; cidade = ""; bairro = ""; rua = $text }
  if ($text -eq "") { return $result }

  $parts = @($text -split '\s*(?:,|\s[-–]\s)\s*' | Where-Object { $_.Trim() -ne "" })
  if ($parts.Count -ge 3) {
    $result.rua = $parts[0].Trim()
    $result.bairro = $parts[1].Trim()
    $last = $parts[$parts.Count - 1].Trim()
    if ($last -match '^(.+?)\s*/\s*([A-Za-z]{2})$') {
      $result.cidade = $Matches[1].Trim()
      $result.estado = $Matches[2].Trim().ToUpperInvariant()
    } else {
      $result.cidade = $last
    }
  }
  return $result
}

function Add-Insert($lines, $table, $columns, $values, $updateColumns) {
  $lines.Add("insert into public.$table ($($columns -join ', ')) values")
  $lines.Add("  ($($values -join ', '))")
  if ($updateColumns.Count -gt 0) {
    $updates = $updateColumns | ForEach-Object { "$_ = excluded.$_" }
    $lines.Add("on conflict ($($columns[0])) do update set $($updates -join ', ');")
  } else {
    $lines.Add("on conflict ($($columns[0])) do nothing;")
  }
  $lines.Add("")
}

if ($AccessPath.Trim() -eq "") {
  $backupDir = Get-ChildItem -LiteralPath (Join-Path $env:USERPROFILE "Downloads") -Directory |
    Where-Object { $_.Name -like "Backup Manuten*" } |
    Select-Object -First 1
  if ($null -ne $backupDir) {
    $accessFile = Get-ChildItem -LiteralPath $backupDir.FullName -Filter "Controle de Manuten*.accdb" |
      Select-Object -First 1
    if ($null -ne $accessFile) {
      $AccessPath = $accessFile.FullName
    }
  }
}

if (-not (Test-Path -LiteralPath $AccessPath)) {
  throw "Arquivo Access nao encontrado: $AccessPath"
}

if ($OutputDir.Trim() -eq "") {
  $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
  $repoRoot = Split-Path -Parent $scriptRoot
  $OutputDir = Join-Path $repoRoot "outputs\access-catalog-import-2026-07-20"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$connection = New-Object System.Data.Odbc.OdbcConnection("Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=$AccessPath;")
$connection.Open()
try {
  $clientes = Read-AccessTable $connection "tb_Clientes"
  $empresas = Read-AccessTable $connection "tb_Empresas"
  $contratos = Read-AccessTable $connection "tb_Contratos"
  $projetos = Read-AccessTable $connection "tb_Projetos"
  $statusUnidades = Read-AccessTable $connection "tb_Status_Unidades"
  $unidades = Read-AccessTable $connection "tb_Unidades_Instaladas"
} finally {
  $connection.Close()
}

$tables = [ordered]@{
  "tb_Clientes" = $clientes
  "tb_Empresas" = $empresas
  "tb_Contratos" = $contratos
  "tb_Projetos" = $projetos
  "tb_Status_Unidades" = $statusUnidades
  "tb_Unidades_Instaladas" = $unidades
}

foreach ($entry in $tables.GetEnumerator()) {
  $entry.Value | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $OutputDir "$($entry.Key).json") -Encoding UTF8
  $entry.Value | Export-Csv -LiteralPath (Join-Path $OutputDir "$($entry.Key).csv") -NoTypeInformation -Encoding UTF8
}

$statusById = @{}
foreach ($status in $statusUnidades) {
  $statusById[[int]$status.ID_Status_Unidade] = $status.Status_Unidade
}

$rejects = New-Object System.Collections.Generic.List[object]
foreach ($contrato in $contratos) {
  if (-not ($clientes | Where-Object { [int]$_.ID_Cliente -eq [int]$contrato.ID_Cliente })) {
    $rejects.Add([pscustomobject]@{ tabela = "tb_Contratos"; id = $contrato.ID_Contrato; motivo = "Cliente inexistente"; referencia = $contrato.ID_Cliente })
  }
  if (-not ($empresas | Where-Object { [int]$_.ID_Empresa -eq [int]$contrato.ID_Empresa })) {
    $rejects.Add([pscustomobject]@{ tabela = "tb_Contratos"; id = $contrato.ID_Contrato; motivo = "Empresa inexistente"; referencia = $contrato.ID_Empresa })
  }
}
foreach ($projeto in $projetos) {
  if (-not ($contratos | Where-Object { [int]$_.ID_Contrato -eq [int]$projeto.ID_Contrato })) {
    $rejects.Add([pscustomobject]@{ tabela = "tb_Projetos"; id = $projeto.ID_Projeto; motivo = "Contrato inexistente"; referencia = $projeto.ID_Contrato })
  }
}
foreach ($unidade in $unidades) {
  if (-not ($projetos | Where-Object { [int]$_.ID_Projeto -eq [int]$unidade.ID_Projeto })) {
    $rejects.Add([pscustomobject]@{ tabela = "tb_Unidades_Instaladas"; id = $unidade.ID_Unidade; motivo = "Projeto inexistente"; referencia = $unidade.ID_Projeto })
  }
}

$duplicateCnpj = @($empresas | Group-Object { Normalize-Cnpj $_.CNPJ } | Where-Object { $_.Name -ne "" -and $_.Count -gt 1 })
$duplicateContratos = @($contratos | Group-Object Numero_Contrato | Where-Object { $_.Name -ne "" -and $_.Count -gt 1 })
$duplicateUnidades = @($unidades | Group-Object TIU | Where-Object { $_.Name -ne "" -and $_.Count -gt 1 })

$sql = New-Object System.Collections.Generic.List[string]
$sql.Add("-- Importacao de cadastros legados gerada em 2026-07-20.")
$sql.Add("-- Fonte: $AccessPath")
$sql.Add("-- Escopo: clientes, empresas, contratos, projetos, unidades instaladas.")
$sql.Add("-- Nao importa OS, atendimentos, materiais, pendencias de OS ou movimentacoes.")
$sql.Add("")
$sql.Add("begin;")
$sql.Add("")
$sql.Add("do `$`$")
$sql.Add("begin")
$sql.Add("  if (select count(*) from public.ordens_manutencao) > 0 then")
$sql.Add("    raise exception 'Carga abortada: existem OS no banco. Esta carga deve ser aplicada antes de recriar OS/atendimentos.';")
$sql.Add("  end if;")
$sql.Add("end")
$sql.Add("`$`$;")
$sql.Add("")
$sql.Add("insert into public.status_contrato (codigo, descricao, ordem) values")
$sql.Add("  ('ativo', 'Ativo', 10),")
$sql.Add("  ('suspenso', 'Suspenso', 20),")
$sql.Add("  ('encerrado', 'Encerrado', 30)")
$sql.Add("on conflict (codigo) do update set descricao = excluded.descricao, ordem = excluded.ordem;")
$sql.Add("")
$sql.Add("insert into public.status_unidade (codigo, descricao, ordem) values")
$sql.Add("  ('instalada', 'Instalada', 10),")
$sql.Add("  ('manutencao', 'Em manutencao', 20),")
$sql.Add("  ('retirada', 'Retirada', 30)")
$sql.Add("on conflict (codigo) do update set descricao = excluded.descricao, ordem = excluded.ordem;")
$sql.Add("")

foreach ($cliente in $clientes) {
  Add-Insert $sql "clientes" @("id_cliente", "nome", "documento", "email", "telefone", "ativo") @(
    [int]$cliente.ID_Cliente,
    (SqlRequiredString $cliente.Nome_Cliente "Cliente $($cliente.ID_Cliente)"),
    "null",
    (SqlString $cliente.Email),
    (SqlString $cliente.Telefone),
    "true"
  ) @("nome", "documento", "email", "telefone", "ativo", "atualizado_em")
}

foreach ($empresa in $empresas) {
  $cnpj = Normalize-Cnpj $empresa.CNPJ
  if ($cnpj -eq "") { $cnpj = "SEM-CNPJ-$($empresa.ID_Empresa)" }
  Add-Insert $sql "empresas" @("id_empresa", "razao_social", "nome_fantasia", "cnpj", "ativo") @(
    [int]$empresa.ID_Empresa,
    (SqlRequiredString $empresa.Nome_Empresa "Empresa $($empresa.ID_Empresa)"),
    (SqlString $empresa.Nome_Empresa),
    (SqlString $cnpj),
    "true"
  ) @("razao_social", "nome_fantasia", "cnpj", "ativo", "atualizado_em")
}

foreach ($contrato in $contratos) {
  Add-Insert $sql "contratos" @("id_contrato", "id_cliente", "id_empresa", "numero_contrato", "objeto", "status_codigo", "data_inicio", "data_fim", "valor_total", "ativo") @(
    [int]$contrato.ID_Contrato,
    [int]$contrato.ID_Cliente,
    [int]$contrato.ID_Empresa,
    (SqlRequiredString $contrato.Numero_Contrato "LEGADO-$($contrato.ID_Contrato)"),
    (SqlString $contrato.Tipo_Recebimento),
    (SqlString (Normalize-StatusContrato $contrato.Status_Contrato)),
    (SqlDate $contrato.Data_Assinatura),
    (SqlDate $contrato.Vigencia_Fim),
    (SqlNumber $contrato.Total_Contrato),
    "true"
  ) @("id_cliente", "id_empresa", "numero_contrato", "objeto", "status_codigo", "data_inicio", "data_fim", "valor_total", "ativo", "atualizado_em")
}

foreach ($projeto in $projetos) {
  Add-Insert $sql "projetos" @("id_projeto", "id_contrato", "nome", "municipio", "uf", "ativo") @(
    [int]$projeto.ID_Projeto,
    [int]$projeto.ID_Contrato,
    (SqlRequiredString $projeto.Nome_Projeto "Projeto $($projeto.ID_Projeto)"),
    "''",
    "''",
    "true"
  ) @("id_contrato", "nome", "municipio", "uf", "ativo", "atualizado_em")
}

foreach ($unidade in $unidades) {
  $location = Split-Location $unidade.Localizacao
  $codigo = if ($null -eq $unidade.TIU -or ([string]$unidade.TIU).Trim() -eq "") { "LEGADO-$($unidade.ID_Unidade)" } else { ([string]$unidade.TIU).Trim() }
  $nomeBase = if ($null -ne $unidade.Descricao -and ([string]$unidade.Descricao).Trim() -ne "") { $unidade.Descricao } elseif ($null -ne $unidade.Tipo_Unidade -and ([string]$unidade.Tipo_Unidade).Trim() -ne "") { $unidade.Tipo_Unidade } else { "Unidade $($unidade.ID_Unidade)" }
  $statusLabel = $statusById[[int]$unidade.ID_Status_Unidade]
  Add-Insert $sql "unidades_instaladas" @("id_unidade", "id_projeto", "codigo", "nome", "estado", "cidade", "bairro", "rua", "google_maps_url", "status_codigo", "ativo") @(
    [int]$unidade.ID_Unidade,
    [int]$unidade.ID_Projeto,
    (SqlString $codigo),
    (SqlRequiredString $nomeBase "Unidade $($unidade.ID_Unidade)"),
    (SqlText $location.estado),
    (SqlText $location.cidade),
    (SqlText $location.bairro),
    (SqlText $location.rua),
    (SqlText $unidade.LinkGM),
    (SqlString (Normalize-StatusUnidade $statusLabel)),
    "true"
  ) @("id_projeto", "codigo", "nome", "estado", "cidade", "bairro", "rua", "google_maps_url", "status_codigo", "ativo", "atualizado_em")
}

$sql.Add("select setval(pg_get_serial_sequence('public.clientes', 'id_cliente'), coalesce((select max(id_cliente) from public.clientes), 1), true);")
$sql.Add("select setval(pg_get_serial_sequence('public.empresas', 'id_empresa'), coalesce((select max(id_empresa) from public.empresas), 1), true);")
$sql.Add("select setval(pg_get_serial_sequence('public.contratos', 'id_contrato'), coalesce((select max(id_contrato) from public.contratos), 1), true);")
$sql.Add("select setval(pg_get_serial_sequence('public.projetos', 'id_projeto'), coalesce((select max(id_projeto) from public.projetos), 1), true);")
$sql.Add("select setval(pg_get_serial_sequence('public.unidades_instaladas', 'id_unidade'), coalesce((select max(id_unidade) from public.unidades_instaladas), 1), true);")
$sql.Add("")
$sql.Add("commit;")
$sql | Set-Content -LiteralPath (Join-Path $OutputDir "import_cadastros_legado.sql") -Encoding UTF8

$report = New-Object System.Collections.Generic.List[string]
$report.Add("# Relatorio de pre-carga - Cadastros legados")
$report.Add("")
$report.Add("Fonte Access: $AccessPath")
$report.Add("Gerado em: 2026-07-20")
$report.Add("")
$report.Add("## Escopo")
$report.Add("")
$report.Add("Incluidos: clientes, empresas, contratos, projetos, status de unidades e unidades instaladas.")
$report.Add("Excluidos: OS, atendimentos, materiais, movimentacoes, pendencias de OS, compras, cobrancas e financeiro.")
$report.Add("")
$report.Add("## Contagens")
$report.Add("")
foreach ($entry in $tables.GetEnumerator()) {
  $report.Add("- $($entry.Key): $($entry.Value.Count)")
}
$report.Add("")
$report.Add("## Duplicidades")
$report.Add("")
$report.Add("- CNPJ duplicado em empresas: $($duplicateCnpj.Count)")
$report.Add("- Numero de contrato duplicado: $($duplicateContratos.Count)")
$report.Add("- TIU/codigo de unidade duplicado: $($duplicateUnidades.Count)")
$report.Add("")
$report.Add("## Inconsistencias de vinculo")
$report.Add("")
if ($rejects.Count -eq 0) {
  $report.Add("Nenhuma inconsistencia de vinculo encontrada entre clientes, empresas, contratos, projetos e unidades.")
} else {
  foreach ($reject in $rejects) {
    $report.Add("- $($reject.tabela) id=$($reject.id): $($reject.motivo) ($($reject.referencia))")
  }
}
$report.Add("")
$report.Add("## Observacoes de mapeamento")
$report.Add("")
$report.Add("- export_postgresql.sql contem schema, mas nao contem dados (INSERT/COPY).")
$report.Add("- O script SQL gerado usa IDs legados explicitamente para preservar os relacionamentos.")
$report.Add("- O script aborta se houver registros em ordens_manutencao, para evitar importar cadastros depois de operacao ja recriada.")
$report.Add("- Campos legados sem destino direto no schema atual foram preservados apenas nos arquivos CSV/JSON intermediarios.")
$report.Add("- Localizacao foi copiado para rua; cidade/bairro/estado so sao inferidos quando o texto tiver separadores claros.")
$report | Set-Content -LiteralPath (Join-Path $OutputDir "RELATORIO_PRE_CARGA.md") -Encoding UTF8

$rejects | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $OutputDir "inconsistencias.json") -Encoding UTF8

Write-Host "Arquivos gerados em: $OutputDir"
Write-Host "Clientes: $($clientes.Count)"
Write-Host "Empresas: $($empresas.Count)"
Write-Host "Contratos: $($contratos.Count)"
Write-Host "Projetos: $($projetos.Count)"
Write-Host "Status unidades: $($statusUnidades.Count)"
Write-Host "Unidades: $($unidades.Count)"
Write-Host "Inconsistencias: $($rejects.Count)"
