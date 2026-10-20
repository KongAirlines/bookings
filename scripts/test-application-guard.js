#!/usr/bin/env node
// Executes the actual generated access guard in Gateway 3.16's Lua runtime.
// This tests the post-ACE boundary, not Portal credential issuance/authorization.
const { execFileSync } = require('node:child_process');
for (const stage of ['dev', 'prod']) {
  const state = JSON.parse(execFileSync('deck', [
    'file', 'render', '--analytics=false', '--format', 'json', 'gateway/' + stage + '/kong.yaml',
  ], { encoding: 'utf8' }));
  const guard = state.services[0].plugins.find(plugin => plugin.name === 'post-function').config.access[0];
  const lua = `
local guard = assert(loadstring(${JSON.stringify(guard)}))
local a = "11111111-1111-4111-8111-111111111111"
local b = "22222222-2222-4222-8222-222222222222"
local cases = {
  {label="missing credentials", anonymous=true, expected=401},
  {label="missing ACE identity", expected=401},
  {label="resolved but unauthorized application", anonymous=true, account=a, expected=401},
  {label="authorized application", account=a, expected=200},
  {label="different authorized application", account=b, expected=200},
}
for _, case in ipairs(cases) do
  local headers = { ["X-KongAir-Account-ID"]=b, ["X-Consumer-Username"]="jdoe", ["X-API-Key"]="test-only" }
  kong = {
    ctx={shared={ace={application_id=case.account}}},
    client={get_consumer=function()
      if case.anonymous then return {username="kongairlines-anonymous"} end
    end},
    service={request={
      clear_header=function(name) headers[name]=nil end,
      set_header=function(name,value) headers[name]=value end,
    }},
    response={exit=function(status) error({status=status}) end},
  }
  local ok, result = pcall(guard)
  local status = ok and 200 or (type(result)=="table" and result.status)
  assert(status==case.expected, case.label .. ": unexpected status")
  if ok then
    assert(headers["X-KongAir-Account-ID"]==case.account, "forged account survived")
    assert(headers["X-Consumer-Username"]==nil, "legacy identity survived")
    assert(headers["X-API-Key"]==nil, "credential forwarded upstream")
  end
  print("PASS " .. case.label)
end
`;
  process.stdout.write(stage + ' post-ACE guard\n');
  process.stdout.write(execFileSync('docker', [
    'run', '--rm', '-i', '--entrypoint', '/usr/local/bin/resty', 'kong/kong-gateway:3.16',
    '-e', 'assert(loadstring(io.read("*a")))()',
  ], { input: lua, encoding: 'utf8' }));
}
