import React, { useState } from "react";
import {
  Table,
  Button,
  Badge,
  Modal,
  Form,
  Row,
  Col,
} from "react-bootstrap";
import { FaTrash, FaEdit } from "react-icons/fa";
import { useGastos } from "../Context/GastosContext";

export default function Lancamentos() {
  const {
    gastos,
    categorias,
    deletarGasto,
    atualizarGasto,
  } = useGastos();

  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [showModal, setShowModal] = useState(false);
  const [gastoEdit, setGastoEdit] = useState(null);

  // Abrir modal de edição
  const handleEdit = (gasto) => {
    setGastoEdit(gasto);
    setShowModal(true);
  };

  // Salvar edição
  const handleSave = async () => {
    try {
      await atualizarGasto(gastoEdit);
      setShowModal(false);
    } catch (error) {
      console.error("Erro ao atualizar gasto:", error);
    }
  };

  // Deletar lançamento
  const handleDelete = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este gasto?")) {
      try {
        await deletarGasto(id);
      } catch (error) {
        console.error("Erro ao excluir gasto:", error);
      }
    }
  };

  // Filtro por categoria
  const gastosFiltrados =
    filtroCategoria === "todos"
      ? gastos
      : gastos.filter(
          (g) => g.categoria?.id === parseInt(filtroCategoria)
        );

  return (
    <div className="card mb-3 shadow-sm">
      <div className="card-body">
        <Row className="align-items-center mb-3">
          <Col>
            <h5 className="card-title fw-bold">Lançamentos</h5>
          </Col>
          <Col xs="auto">
            <Form.Select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
            >
              <option value="todos">Todas as categorias</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </Form.Select>
          </Col>
        </Row>

        <Table
          hover
          responsive
          bordered
          className="text-center align-middle"
        >
          <thead className="table-light">
            <tr>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Data</th>
              <th>Categoria</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {gastosFiltrados.length > 0 ? (
              gastosFiltrados.map((gasto) => (
                <tr key={gasto.id}>
                  <td>{gasto.descricao}</td>
                  <td className="text-danger">
                    R$ {parseFloat(gasto.valor).toFixed(2).replace(".", ",")}
                  </td>
                  <td>
                    {new Date(gasto.data).toLocaleDateString("pt-BR")}
                  </td>
                  <td>
                    <Badge bg="secondary">
                      {gasto.categoria?.nome}
                    </Badge>
                  </td>
                  <td>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="me-2"
                      onClick={() => handleEdit(gasto)}
                    >
                      <FaEdit />
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(gasto.id)}
                    >
                      <FaTrash />
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5">Nenhum lançamento encontrado.</td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Modal de edição */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Editar Gasto</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {gastoEdit && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Descrição</Form.Label>
                <Form.Control
                  type="text"
                  value={gastoEdit.descricao}
                  onChange={(e) =>
                    setGastoEdit({
                      ...gastoEdit,
                      descricao: e.target.value,
                    })
                  }
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Valor (R$)</Form.Label>
                <Form.Control
                  type="number"
                  value={gastoEdit.valor}
                  onChange={(e) =>
                    setGastoEdit({
                      ...gastoEdit,
                      valor: e.target.value,
                    })
                  }
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Data</Form.Label>
                <Form.Control
                  type="date"
                  value={gastoEdit.data}
                  onChange={(e) =>
                    setGastoEdit({
                      ...gastoEdit,
                      data: e.target.value,
                    })
                  }
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Categoria</Form.Label>
                <Form.Select
                  value={gastoEdit.categoria.id}
                  onChange={(e) =>
                    setGastoEdit({
                      ...gastoEdit,
                      categoria: {
                        ...gastoEdit.categoria,
                        id: Number(e.target.value),
                      },
                    })
                  }
                >
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowModal(false)}
          >
            Cancelar
          </Button>
          <Button variant="success" onClick={handleSave}>
            Salvar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
