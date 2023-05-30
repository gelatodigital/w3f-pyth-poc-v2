import hre, {  } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { sleep } from "../src/utils";

const isHardhat = hre.network.name === "hardhat";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer, gelatoMsgSender, pyth } = await getNamedAccounts();

  if (!isHardhat) {
    console.log(
      `Deploying SmartOracle to ${hre.network.name}. Hit ctrl + c to abort`
    );
    await sleep(5000);
  }

  await deploy("SmartOracle", {
    from: deployer,
    args: [gelatoMsgSender, pyth],
    log: true,
  });
};

func.skip = async () => {
  return false;
};
func.tags = ["SmartOracle"];

export default func;
