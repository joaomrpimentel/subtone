PYTHON := $(shell command -v python3 || command -v python)

BUILD_DIR := dist

.DEFAULT_GOAL := help


run: build
	@echo "Iniciando servidor local em http://localhost:8000 a partir de '$(BUILD_DIR)'..."
	@echo "Acesse http://localhost:8000 no seu navegador."
	@echo "Pressione CTRL+C para parar o servidor."
	@cd $(BUILD_DIR) && $(PYTHON) -m http.server 8000

build: clean check_python
	@echo "Montando o ambiente de desenvolvimento em '$(BUILD_DIR)'..."
	@mkdir -p $(BUILD_DIR)
	@cp -r public/* $(BUILD_DIR)/
	@cp -r src $(BUILD_DIR)/

clean:
	@echo "Limpando o diretório de build..."
	@rm -rf $(BUILD_DIR)


check_python:
	@if [ -z "$(PYTHON)" ]; then \
		echo "Erro: Python não encontrado."; \
		echo "   Por favor, instale Python 3 para rodar o servidor local."; \
		echo "   https://www.python.org/downloads/"; \
		exit 1; \
	fi

# Comando para exibir a ajuda.
.PHONY: help run build clean check_python
help:
	@echo "Comandos disponíveis:"
	@echo "  make run    - Monta o ambiente e inicia o servidor de desenvolvimento."
	@echo "  make build  - Apenas monta o ambiente de desenvolvimento na pasta '$(BUILD_DIR)'."
	@echo "  make clean  - Remove a pasta de ambiente '$(BUILD_DIR)'."
	@echo "  make help   - Mostra esta mensagem de ajuda."

