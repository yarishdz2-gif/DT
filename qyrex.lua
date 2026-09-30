-- =====================================================
-- QYREX CUSTOM VM LOADER
-- =====================================================

local GITHUB_RAW = "https://raw.githubusercontent.com/TU_USUARIO/TU_REPO/main/qyrex.txt" -- ← cambia esto
local HttpService = game:GetService("HttpService")
local StarterGui = game:GetService("StarterGui")

-- Anti-tamper simple
if type(print) ~= "function" or type(string) ~= "table" then
	while true do end
end

-- Descargar el código especial
local success, content = pcall(function()
	return HttpService:GetAsync(GITHUB_RAW)
end)

if not success then
	warn("No se pudo cargar QYREX desde GitHub")
	return
end

-- ===================== CUSTOM VM =====================
local function runQYREX(code)
	local lines = string.split(code, "\n")

	for _, line in ipairs(lines) do
		line = string.gsub(line, "^%s*(.-)%s*$", "%1") -- quitar espacios
		if line == "" or string.sub(line, 1, 1) == "#" then
			continue -- comentarios o líneas vacías
		end

		local parts = string.split(line, ":")
		local cmd = parts[1] and string.upper(parts[1]) or ""
		local action = parts[2] and string.upper(parts[2]) or ""
		local value = parts[3] or table.concat(parts, ":", 3)

		-- ========== INSTRUCCIONES QYX ==========
		if cmd == "QYX" then
			if action == "PRINT" then
				print(value)
			elseif action == "WARN" then
				warn(value)
			elseif action == "ERROR" then
				error(value)
			end

		-- ========== INSTRUCCIONES QYREX ==========
		elseif cmd == "QYREX" then
			if action == "WAIT" then
				task.wait(tonumber(value) or 1)
			elseif action == "NOTIFY" then
				pcall(function()
					StarterGui:SetCore("SendNotification", {
						Title = "QYREX VM",
						Text = value,
						Duration = 4
					})
				end)
			elseif action == "EXECUTE" then
				-- Ejecuta código Luau real (cuidado)
				local fn, err = loadstring(value)
				if fn then
					pcall(fn)
				else
					warn("Error en EXECUTE:", err)
				end
			elseif action == "END" then
				break
			elseif action == "CLEAR" then
				-- puedes añadir más acciones
			end

		-- ========== INSTRUCCIONES EXTRA (puedes inventar más) ==========
		elseif cmd == "QXYZ" then
			if action == "PRINT" then
				print("[QXYZ]", value)
			end
		elseif cmd == "QX" then
			if action == "LOG" then
				print("[QX LOG]", value)
			end
		end
	end
end

-- Ejecutar el VM
runQYREX(content)
