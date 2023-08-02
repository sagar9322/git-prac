const incomeDetail = require('../models/income');

exports.postIncomeDetail = async (req, res, next) => {
  try {
    const income = req.body.income;

    await incomeDetail.create({
      income: income,
      userId: req.user.id
    });

    res.status(200).json({message: "submitted"});
  } catch (err) {
    console.log(err);
    res.status(500).json({message: "An error occurred"});
  }
};

exports.getIncomeDetail = async (req, res, next) => {
  try {
    const details = await incomeDetail.findAll({where: {userId: req.user.id}});
    res.setHeader('Content-Type', 'text/html');
    res.send(JSON.stringify(details));
  } catch (err) {
    console.log(err);
    res.status(500).json({message: "An error occurred"});
  }
};