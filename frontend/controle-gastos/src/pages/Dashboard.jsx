import React, { useEffect, useState } from "react";
import api from "../services/api";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function Dashboard() {
  const [salario, setSalario] = useState(0);
  const [gastos, setGastos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [salarioRes, gastosRes] = await Promise.all([
          api.get("/rendas"),
          api.get("/gastos"),
        ]);

        // A listagem vem ordenada da competência mais recente para a mais
        // antiga: o índice 0 é a renda atual. O `.at(-1)` anterior pegava
        // justamente a mais ANTIGA, divergindo da tela de Controle.
        const rendas = salarioRes.data.data;
        setSalario(parseFloat(rendas[0]?.valor ?? 0));

        setGastos(gastosRes.data.data);
      } catch (err) {
        console.error("Erro ao carregar dados do resumo:", err);
      } finally {
        setCarregando(false);
      }
    };

    carregarDados();
  }, []);

  if (carregando)
    return (
      <div className="container py-4">
        <div className="row mb-4">
          {[1,2,3,4].map((i) => (
            <div className="col-md-3 mb-3" key={i}>
              <div className="card p-3 shadow-sm">
                <div className="placeholder-glow">
                  <span className="placeholder col-6"></span>
                  <span className="placeholder col-8 mt-3"></span>
                </div>
              </div>
            </div>
          ))}
        </div>
  
        <div className="row">
          <div className="col-md-6 mb-3">
            <div className="card p-4 shadow-sm placeholder-glow">
              <span className="placeholder col-6 mb-3"></span>
              <span className="placeholder col-12" style={{ height: 250 }}></span>
            </div>
          </div>
  
          <div className="col-md-6 mb-3">
            <div className="card p-4 shadow-sm placeholder-glow">
              <span className="placeholder col-6 mb-3"></span>
              {[1,2,3].map(i => (
                <span key={i} className="placeholder col-12 mb-2" style={{ height: 35 }}></span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  
  

  
  const totalGastos = gastos.reduce((acc, g) => acc + parseFloat(g.valor), 0);
  const saldoFinal = salario - totalGastos;
  const status = saldoFinal >= 0 ? "Positivo" : "Negativo";

  const necessidades = salario * 0.5;
  const desejos = salario * 0.3;
  const poupanca = salario * 0.2;


  const categoriasPorGasto = gastos.reduce((acc, gasto) => {
    const nomeCat = gasto.categoria?.nome || "Sem categoria";
    acc[nomeCat] = (acc[nomeCat] || 0) + Number(gasto.valor);
    return acc;
  }, {});
  
  
  const dataGrafico = Object.entries(categoriasPorGasto).map(([name, value]) => ({
    name,
    value,
  }));
  

  const COLORS = ["#1E90FF", "#FF6347", "#32CD32", "#FFD700", "#8A2BE2", "#999"];

  
  const exportarPDF = async () => {
    const elemento = document.getElementById("pdf-content");
  
    const canvas = await html2canvas(elemento, {
      scale: 2,             
      useCORS: true,        
      logging: false
    });
  
    const imgData = canvas.toDataURL("image/png");
  
   
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
  
    
    const imgWidth = pageWidth - 20; // margem de 10mm cada lado
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
    let posY = 20; 
  
    
    pdf.setFontSize(14);
    pdf.text("Resumo Financeiro - Relatório", pageWidth / 2, 12, {
      align: "center",
    });
  
    
    pdf.setLineWidth(0.3);
    pdf.line(10, 15, pageWidth - 10, 15);
  
    
    pdf.addImage(imgData, "PNG", 10, posY, imgWidth, imgHeight);
  
    
    pdf.setFontSize(10);
    pdf.text(
      `Gerado automaticamente em ${new Date().toLocaleDateString("pt-BR")}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  
    pdf.save("resumo-geral.pdf");
  };
  

  return (
    <div id="pdf-content" className="container py-4">

      {/* Cabeçalho */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <button className="btn btn-light" onClick={() => navigate("/controle")}>
          ← Voltar pro Controle Financeiro
        </button>

        <h3 className="fw-bold">Dashboard</h3>

        <button className="btn btn-dark" onClick={exportarPDF}>
          Exportar PDF
        </button>
      </div>

      {/* Cards principais */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card p-3 shadow-sm">
            <h6>Salário</h6>
            <h4 className="fw-bold text-primary">R$ {salario.toLocaleString()}</h4>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card p-3 shadow-sm">
            <h6>Total de Gastos</h6>
            <h4 className="fw-bold text-danger">R$ {totalGastos.toLocaleString()}</h4>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card p-3 shadow-sm">
            <h6>Saldo Final</h6>
            <h4 className={`fw-bold ${saldoFinal >= 0 ? "text-success" : "text-danger"}`}>
              R$ {saldoFinal.toLocaleString()}
            </h4>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card p-3 shadow-sm">
            <h6>Status</h6>
            <span className={`badge ${saldoFinal >= 0 ? "bg-success" : "bg-danger"}`}>
              {status}
            </span>
          </div>
        </div>
      </div>

      {/* Gráfico e Regra 50/30/20 */}
      <div className="row">
        <div className="col-md-6">
          <div className="card p-4 shadow-sm">
            <h6 className="fw-bold mb-3">Distribuição por Categoria</h6>

            {dataGrafico.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dataGrafico}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label
                  >
                    {dataGrafico.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted">Nenhum gasto para exibir</p>
            )}
          </div>
        </div>

        {/* Regra */}
        <div className="col-md-6">
          <div className="card p-4 shadow-sm">
            <h6 className="fw-bold mb-3">Regra 50/30/20</h6>

            <div className="mb-3">
              <span>Necessidades (50%)</span>
              <div className="progress my-2">
                <div
                  className="progress-bar bg-danger"
                  style={{ width: `${(totalGastos / necessidades) * 100}%` }}
                ></div>
              </div>
              <small>R$ {necessidades.toLocaleString()}</small>
            </div>

            <div className="mb-3">
              <span>Desejos (30%)</span>
              <div className="progress my-2">
                <div
                  className="progress-bar bg-primary"
                  style={{ width: `${(totalGastos / desejos) * 100}%` }}
                ></div>
              </div>
              <small>R$ {desejos.toLocaleString()}</small>
            </div>

            <div className="mb-3">
              <span>Poupança (20%)</span>
              <div className="progress my-2">
                <div
                  className="progress-bar bg-success"
                  style={{ width: `${(totalGastos / poupanca) * 100}%` }}
                ></div>
              </div>
              <small>R$ {poupanca.toLocaleString()}</small>
            </div>

            <div className="alert alert-light mt-3">
              <strong>Total gasto:</strong>{" "}
              {((totalGastos / salario) * 100).toFixed(1)}% do salário <br />
              {totalGastos <= salario * 0.8 ? (
                <span className="text-success">✅ Dentro do limite recomendado</span>
              ) : (
                <span className="text-danger">⚠️ Gastos acima do ideal</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
