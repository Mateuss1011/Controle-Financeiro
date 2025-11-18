import { useContext } from "react";
import { SalarioContext } from "./SalarioContext";

export const useSalario = () => useContext(SalarioContext);
