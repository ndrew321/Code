from __future__ import annotations

import ast
import operator
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static" 

app = FastAPI(title="Modern Calculator API")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class CalcRequest(BaseModel):
	expression: str


class CalcResponse(BaseModel):
	expression: str
	result: float


ALLOWED_OPERATORS = {
	ast.Add: operator.add,
	ast.Sub: operator.sub,
	ast.Mult: operator.mul,
	ast.Div: operator.truediv,
	ast.Pow: operator.pow,
	ast.Mod: operator.mod,
}


def evaluate_expression(expression: str) -> float:
	"""Safely evaluate arithmetic expressions with basic operators."""

	def _evaluate(node: ast.AST) -> float:
		if isinstance(node, ast.Expression):
			return _evaluate(node.body)

		if isinstance(node, ast.Num):
			return float(node.n)

		if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
			return float(node.value)

		if isinstance(node, ast.BinOp) and type(node.op) in ALLOWED_OPERATORS:
			left = _evaluate(node.left)
			right = _evaluate(node.right)
			return float(ALLOWED_OPERATORS[type(node.op)](left, right))

		if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
			operand = _evaluate(node.operand)
			return operand if isinstance(node.op, ast.UAdd) else -operand

		raise ValueError("Unsupported expression")

	try:
		parsed = ast.parse(expression, mode="eval")
		return _evaluate(parsed)
	except ZeroDivisionError as exc:
		raise ValueError("Division by zero") from exc
	except (SyntaxError, ValueError, TypeError) as exc:
		raise ValueError("Invalid expression") from exc


@app.get("/")
async def index() -> FileResponse:
	return FileResponse(STATIC_DIR / "index.html")


@app.post("/api/calc", response_model=CalcResponse)
async def calculate(payload: CalcRequest) -> CalcResponse:
	expression = payload.expression.strip()
	if not expression:
		raise HTTPException(status_code=400, detail="Expression is required")

	try:
		result = evaluate_expression(expression)
	except ValueError as exc:
		raise HTTPException(status_code=400, detail=str(exc)) from exc

	return CalcResponse(expression=expression, result=result)


if __name__ == "__main__":
	import uvicorn

	uvicorn.run("calculator:app", host="127.0.0.1", port=8000, reload=True)