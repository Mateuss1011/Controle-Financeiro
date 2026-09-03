import { Container, Row, Col, Card, Form, Button } from "react-bootstrap";
import api from "../services/api";
import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(""); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro(""); 

    try {
      const response = await api.post("/login", {
        email: email,
        password: senha,
      });

      localStorage.setItem("token", response.data.token);

      // Recarrega para que os Contexts, que só buscam dados com token
      // presente, montem já autenticados.
      window.location.href = "/controle";

    } catch (error) {
      const mensagemErro = error.response?.data?.message || "Email ou senha incorretos.";
      setErro(mensagemErro);
    }
    
  };

  return (
    <Container className="d-flex justify-content-center align-items-center vh-100">
      <Row className="w-100">
        <Col md={{ span: 6, offset: 3 }}>
          <Card className="shadow-lg p-5">
            <h3 className="text-center mb-2">Login</h3>
            <p className="text-center text-muted mb-4">
              Acesse seu controle financeiro
            </p>

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="formBasicEmail">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Digite seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-4" controlId="formBasicPassword">
                <Form.Label>Senha</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
              </Form.Group>

              {/* 3. Exibe a mensagem de erro aqui */}
              {erro && (
                <p className="text-danger text-center mb-3">{erro}</p>
              )}

              <Button variant="dark" type="submit" className="w-100 py-2">
                Entrar
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}